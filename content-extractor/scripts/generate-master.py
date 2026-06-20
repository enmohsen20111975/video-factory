#!/usr/bin/env python3
"""
Master Generator: Raw Page JSON → master.json + lesson.json (Unified Format)
============================================================================
Reads per-page VLM extraction JSONs (raw-json/ OR merged-lessons/) and
generates the unified book structure used by the Unified Video Factory:

    data/books/{bookId}/
    ├── master.json          (book metadata + units + stats)
    ├── lessons/
    │   ├── lesson-1-1.json  (one per detected lesson)
    │   └── ...
    └── images/
        ├── lesson-1-1/
        │   ├── img-001.png
        │   └── ...
        └── ...

Lesson Detection Strategy
-------------------------
1. If a `--book-index` JSON is supplied (or one is detected at the standard
   path), the explicit page→lesson mapping wins. Pages listed there are
   grouped, and lesson/unit ids come from the index.
2. Otherwise we fall back to VLM-suggested `lesson_id` / `unit_id` fields.
3. If those are missing too, we use the heuristic:
   - A page with `page_type == "lesson"` AND a non-empty `lesson_title`
     starts a new lesson.
   - Subsequent lesson/exercise/example/summary pages attach to the
     current lesson until a new lesson title appears.
   - Cover/index/empty pages are skipped (do not start a lesson).

Usage
-----
    python generate-master.py --book-id "physics-3rd-secondary" \\
        --input "raw-json/" \\
        --output "../../data/books/physics-3rd-secondary/"

    python generate-master.py --book-id "physics-3rd-secondary" \\
        --input "merged-lessons/" --input-format "merged" \\
        --output "../../data/books/physics-3rd-secondary/" \\
        --images-dir "../content-extractor/temp/"

    python generate-master.py --book-id "physics-3rd-secondary" \\
        --input "raw-json/" --output "out/" \\
        --book-index "config/book-index.json" \\
        --model "qwen2-vl:7b" --force
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

# Fix Windows console encoding for emoji printing
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

# =============================================================================
# Config Loading
# =============================================================================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONTENT_EXTRACTOR_DIR = os.path.dirname(SCRIPT_DIR)
PROJECT_ROOT = os.path.abspath(os.path.join(CONTENT_EXTRACTOR_DIR, ".."))
DEFAULT_BOOKS_DIR = os.path.join(PROJECT_ROOT, "data", "books")
DEFAULT_INDEX = os.path.join(CONTENT_EXTRACTOR_DIR, "config", "book-index.json")


def load_pipeline_config() -> dict:
    """Load the active pipeline-config.json (prefers data/config/, falls back to content-extractor/config/)."""
    candidates = [
        os.path.join(PROJECT_ROOT, "data", "config", "pipeline-config.json"),
        os.path.join(CONTENT_EXTRACTOR_DIR, "config", "pipeline-config.json"),
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"⚠️  Warning: Failed to load {p}: {e}")
    return {}


_CONFIG = load_pipeline_config()
_MERGE_CONFIG = _CONFIG.get("stage_3_merger", {})
CONFIDENCE_THRESHOLD = _MERGE_CONFIG.get("confidence_threshold", 0.6)


# =============================================================================
# Page Loading
# =============================================================================

PAGE_FILE_RE = re.compile(r"^page_(\d{4})\.json$", re.IGNORECASE)


def list_page_files(input_dir: str) -> list[str]:
    """Return sorted list of page_XXXX.json file paths."""
    if not os.path.isdir(input_dir):
        return []
    files = []
    for name in os.listdir(input_dir):
        if PAGE_FILE_RE.match(name):
            files.append(os.path.join(input_dir, name))
    files.sort()
    return files


def load_page(path: str) -> dict | None:
    """Load a single page JSON, returning None on failure."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        print(f"  ⚠️  Failed to load {os.path.basename(path)}: {e}")
        return None


def is_successful(page: dict) -> bool:
    """A page is successful if VLM extracted content (status success and not empty)."""
    if not page:
        return False
    if page.get("status") and page.get("status") != "success":
        return False
    return page.get("page_type") not in (None, "empty", "unclear")


def average_confidence(pages: list[dict]) -> float:
    scores = [p.get("confidence") for p in pages if isinstance(p.get("confidence"), (int, float))]
    if not scores:
        return 0.0
    return round(sum(scores) / len(scores), 3)


# =============================================================================
# Lesson Grouping (3 strategies)
# =============================================================================

def group_by_book_index(
    pages: list[dict],
    book_index: dict,
) -> list[dict]:
    """
    Group pages using an explicit book-index.json mapping.
    Returns a list of lesson groups: {lesson_id, lesson_title, unit_id, unit_title, pages: [...]}
    """
    groups: list[dict] = []
    pages_by_num: dict[int, dict] = {
        p.get("page_number"): p for p in pages if p.get("page_number") is not None
    }

    unit_order = 1
    for chapter in book_index.get("chapters", []):
        # Map chapter → unit. If chapter.id is "ch-01-...", we use "unit-<order>"
        unit_id = f"unit-{unit_order}"
        unit_title = chapter.get("name", f"Unit {unit_order}")
        lesson_order_in_unit = 0
        for lesson in chapter.get("lessons", []):
            lesson_order_in_unit += 1
            lesson_id = f"lesson-{unit_order}-{lesson_order_in_unit}"
            lesson_title = lesson.get("title", "")
            page_nums = lesson.get("pages", [])

            lesson_pages = []
            for n in page_nums:
                p = pages_by_num.get(n)
                if p is not None:
                    lesson_pages.append(p)
                else:
                    print(f"  ⚠️  Page {n} (expected for {lesson_id}) not found in raw-json")

            groups.append({
                "lesson_id": lesson_id,
                "lesson_title": lesson_title,
                "unit_id": unit_id,
                "unit_title": unit_title,
                "unit_order": unit_order,
                "lesson_order": lesson_order_in_unit,
                "pages": lesson_pages,
                "page_numbers": list(page_nums),
            })
        unit_order += 1

    return groups


def group_by_vlm_fields(pages: list[dict]) -> list[dict]:
    """
    Group pages by VLM-suggested `lesson_id` / `unit_id`.
    Pages without these fields fall back to the heuristic below.
    """
    # First pass: collect pages that DO have a lesson_id from the VLM
    grouped: dict[str, dict] = {}
    unassigned: list[dict] = []

    for p in pages:
        lid = (p.get("lesson_id") or "").strip()
        if lid:
            if lid not in grouped:
                grouped[lid] = {
                    "lesson_id": lid,
                    "lesson_title": p.get("lesson_title") or lid,
                    "unit_id": (p.get("unit_id") or "unit-1").strip() or "unit-1",
                    "unit_title": p.get("unit_title") or "",
                    "pages": [],
                    "page_numbers": [],
                }
            grouped[lid]["pages"].append(p)
            if p.get("page_number") is not None:
                grouped[lid]["page_numbers"].append(p["page_number"])
            # Promote lesson title if we have none yet
            if not grouped[lid]["lesson_title"] and p.get("lesson_title"):
                grouped[lid]["lesson_title"] = p["lesson_title"]
            if not grouped[lid]["unit_title"] and p.get("unit_title"):
                grouped[lid]["unit_title"] = p["unit_title"]
        else:
            unassigned.append(p)

    # Heuristic for pages without a lesson_id: attach to the most recent lesson
    # whose last page is < current page_number, otherwise start a new lesson.
    sorted_lessons = sorted(
        grouped.values(),
        key=lambda g: (min(g["page_numbers"]) if g["page_numbers"] else 99999),
    )
    for p in unassigned:
        pnum = p.get("page_number") or 0
        attached = False
        for g in sorted_lessons:
            if g["page_numbers"] and max(g["page_numbers"]) < pnum:
                g["pages"].append(p)
                g["page_numbers"].append(pnum)
                attached = True
                break
        if not attached:
            # Start a new lesson for this orphan page
            new_lid = f"lesson-orphan-{pnum:04d}"
            grouped[new_lid] = {
                "lesson_id": new_lid,
                "lesson_title": p.get("lesson_title") or f"صفحة {pnum}",
                "unit_id": (p.get("unit_id") or "unit-1").strip() or "unit-1",
                "unit_title": p.get("unit_title") or "",
                "pages": [p],
                "page_numbers": [pnum],
            }
            sorted_lessons.append(grouped[new_lid])

    # Build unit ordering + lesson order
    return _finalize_groups(list(grouped.values()))


def group_by_heuristic(pages: list[dict]) -> list[dict]:
    """
    Fallback heuristic: a page with page_type 'lesson' AND a lesson_title
    starts a new lesson. Subsequent pages attach until a new lesson starts.
    Cover/index/empty pages are skipped.
    """
    groups: list[dict] = []
    current: dict | None = None

    unit_counter = 0
    lesson_counter_in_unit = 0
    last_unit_title = None

    for p in sorted(pages, key=lambda x: x.get("page_number") or 0):
        ptype = (p.get("page_type") or "").strip()
        title = (p.get("lesson_title") or "").strip()
        unit_title = (p.get("unit_title") or "").strip()

        # Skip empty/cover/index pages from starting lessons
        if ptype in ("empty", "cover", "index"):
            continue

        # If unit_title changed, increment unit counter
        if unit_title and unit_title != last_unit_title:
            unit_counter += 1
            lesson_counter_in_unit = 0
            last_unit_title = unit_title
        elif not last_unit_title:
            unit_counter = 1
            last_unit_title = unit_title or "Unit 1"

        # Start a new lesson if explicitly a lesson page with a title, OR no current lesson yet
        if current is None or (ptype == "lesson" and title):
            lesson_counter_in_unit += 1
            lid = f"lesson-{unit_counter}-{lesson_counter_in_unit}"
            uid = f"unit-{unit_counter}"
            current = {
                "lesson_id": lid,
                "lesson_title": title or f"Lesson {lesson_counter_in_unit}",
                "unit_id": uid,
                "unit_title": last_unit_title,
                "pages": [],
                "page_numbers": [],
            }
            groups.append(current)

        current["pages"].append(p)
        if p.get("page_number") is not None:
            current["page_numbers"].append(p["page_number"])
        # Promote title if first page had none
        if (not current["lesson_title"] or current["lesson_title"].startswith("Lesson ")) and title:
            current["lesson_title"] = title

    return _finalize_groups(groups)


def _finalize_groups(groups: list[dict]) -> list[dict]:
    """Assign unit_order/lesson_order based on min page numbers and dedupe units."""
    # Sort by first page number
    groups.sort(key=lambda g: (min(g["page_numbers"]) if g["page_numbers"] else 99999))

    # Assign unit ids in order of appearance
    seen_units: dict[str, int] = {}
    unit_counter = 0
    for g in groups:
        uid = g.get("unit_id") or "unit-1"
        if uid not in seen_units:
            unit_counter += 1
            seen_units[uid] = unit_counter
        # Normalize unit id to "unit-<order>" if it isn't already
        if not re.match(r"^unit-\d+$", uid):
            g["unit_id"] = f"unit-{seen_units[uid]}"
        g["unit_order"] = seen_units[uid]

    # Assign lesson order within unit
    per_unit_counter: dict[int, int] = defaultdict(int)
    for g in groups:
        per_unit_counter[g["unit_order"]] += 1
        g["lesson_order"] = per_unit_counter[g["unit_order"]]
        # Normalize lesson id to "lesson-<unit>-<n>" if not already
        if not re.match(r"^lesson-\d+-\d+$", g["lesson_id"]):
            g["lesson_id"] = f"lesson-{g['unit_order']}-{g['lesson_order']}"

    return groups


def group_pages_into_lessons(
    pages: list[dict],
    book_index: dict | None,
) -> list[dict]:
    """Choose the right grouping strategy."""
    if book_index:
        print(f"📖 Using explicit book-index mapping "
              f"({len(book_index.get('chapters', []))} chapters)")
        return group_by_book_index(pages, book_index)

    # Try VLM fields first
    have_vlm_lids = any((p.get("lesson_id") or "").strip() for p in pages)
    if have_vlm_lids:
        print("🧠 Grouping by VLM-suggested lesson_id/unit_id fields")
        return group_by_vlm_fields(pages)

    print("🔍 Falling back to title-based heuristic for lesson detection")
    return group_by_heuristic(pages)


# =============================================================================
# Content Merging
# =============================================================================

def _ensure_ids(items: list[dict], prefix: str) -> list[dict]:
    """Ensure each item has a unique `id`, generating one if missing/duplicate."""
    seen: set[str] = set()
    out = []
    for i, item in enumerate(items, start=1):
        if not isinstance(item, dict):
            continue
        item = dict(item)  # shallow copy
        existing_id = item.get("id")
        if not existing_id or existing_id in seen:
            existing_id = f"{prefix}-{i:03d}"
            # Ensure uniqueness even if VLM produced duplicate ids
            while existing_id in seen:
                i += 1
                existing_id = f"{prefix}-{i:03d}"
        item["id"] = existing_id
        seen.add(existing_id)
        out.append(item)
    return out


def _dedupe_by_key(items: list[dict], key: str) -> list[dict]:
    seen: set[str] = set()
    out = []
    for item in items:
        k = (str(item.get(key, "")).strip()).lower()
        if k and k in seen:
            continue
        if k:
            seen.add(k)
        out.append(item)
    return out


def merge_lesson_content(group: dict) -> dict:
    """Merge all pages of one lesson group into a unified content dict."""
    pages = [p for p in group["pages"] if is_successful(p)]

    raw_definitions: list[dict] = []
    raw_formulas: list[dict] = []
    raw_examples: list[dict] = []
    raw_exercises: list[dict] = []
    raw_tables: list[dict] = []
    raw_figures: list[dict] = []
    raw_key_points: list[str] = []
    raw_text_parts: list[str] = []
    summaries: list[str] = []

    for p in pages:
        raw_definitions.extend(p.get("definitions") or [])
        raw_formulas.extend(p.get("formulas") or [])
        raw_examples.extend(p.get("examples") or [])
        raw_exercises.extend(p.get("exercises") or [])
        raw_tables.extend(p.get("tables") or [])
        raw_figures.extend(p.get("figures") or [])
        raw_key_points.extend(p.get("key_points") or [])
        if p.get("raw_text"):
            raw_text_parts.append(p["raw_text"])
        if p.get("content_summary"):
            summaries.append(p["content_summary"])

    # Normalize formula field name FIRST: VLM may produce "formula_latex"
    # → rename to "latex" so dedup catches duplicates correctly.
    for f in raw_formulas:
        if "latex" not in f and f.get("formula_latex"):
            f["latex"] = f.pop("formula_latex")
        elif "latex" in f and "formula_latex" in f:
            # Keep just `latex`
            f.pop("formula_latex", None)

    # Deduplicate (after normalization)
    raw_definitions = _dedupe_by_key(raw_definitions, "term")
    raw_formulas = _dedupe_by_key(raw_formulas, "latex")
    raw_examples = _dedupe_by_key(raw_examples, "question")
    raw_exercises = _dedupe_by_key(raw_exercises, "question")
    raw_tables = _dedupe_by_key(raw_tables, "title")
    # Figures: dedupe by description
    raw_figures = _dedupe_by_key(raw_figures, "description")
    # Key points: preserve order, remove dupes
    raw_key_points = list(dict.fromkeys(raw_key_points))

    # Ensure ids
    raw_definitions = _ensure_ids(raw_definitions, "def")
    raw_formulas = _ensure_ids(raw_formulas, "form")
    raw_examples = _ensure_ids(raw_examples, "ex")
    raw_exercises = _ensure_ids(raw_exercises, "q")
    raw_tables = _ensure_ids(raw_tables, "tbl")
    raw_figures = _ensure_ids(raw_figures, "fig")

    avg_conf = average_confidence(pages)
    needs_review = avg_conf < CONFIDENCE_THRESHOLD or any(
        (p.get("confidence") or 1.0) < CONFIDENCE_THRESHOLD for p in pages
    )

    # Determine page range
    page_numbers = sorted(g for g in group.get("page_numbers", []) if isinstance(g, int))
    page_start = page_numbers[0] if page_numbers else 0
    page_end = page_numbers[-1] if page_numbers else 0

    return {
        "content": {
            "raw_text": "\n\n".join(raw_text_parts).strip(),
            "summary": " ".join(summaries).strip(),
            "objectives": [],  # left empty for human editor
            "definitions": raw_definitions,
            "formulas": raw_formulas,
            "examples": raw_examples,
            "explanations": [],  # populated from examples if needed later
        },
        "exercises": raw_exercises,
        "tables": raw_tables,
        "figures": raw_figures,
        "key_points": raw_key_points,
        "page_start": page_start,
        "page_end": page_end,
        "pages_processed": page_numbers,
        "average_confidence": avg_conf,
        "needs_review": needs_review,
        "low_confidence_pages": [
            {"page": p.get("page_number"), "confidence": p.get("confidence"), "notes": p.get("notes", "")}
            for p in pages
            if (p.get("confidence") or 1.0) < CONFIDENCE_THRESHOLD
        ],
        "failed_pages": [
            {"page": p.get("page_number"), "error": p.get("error", "Unknown")}
            for p in group["pages"]
            if not is_successful(p)
        ],
    }


# =============================================================================
# Lesson JSON Builder
# =============================================================================

DEFAULT_SCENES = [
    {"type": "intro", "duration_sec": 4, "title": "المقدمة"},
    {"type": "title", "duration_sec": 8, "title": "عنوان الدرس"},
    {"type": "formula", "duration_sec": 12, "formula_id": None},
    {"type": "simulator", "duration_sec": 16, "config": {}},
    {"type": "mindmap", "duration_sec": 15},
    {"type": "quiz", "duration_sec": 15, "question_ids": []},
    {"type": "outro", "duration_sec": 5},
]


def build_lesson_json(
    book_id: str,
    group: dict,
    merged: dict,
    book_meta: dict,
    model: str,
) -> dict:
    """Build a lesson.json object matching lesson.template.json schema."""
    now = datetime.now().isoformat()
    lesson_id = group["lesson_id"]
    title = group.get("lesson_title") or "درس بدون عنوان"

    # Build images array — figure ids reference the images we'll copy
    images: list[dict] = []
    for idx, fig in enumerate(merged["figures"], start=1):
        img_id = f"img-{idx:03d}"
        page_num = merged["pages_processed"][idx - 1] if idx - 1 < len(merged["pages_processed"]) else None
        # path is relative to the book dir
        rel_path = f"images/{lesson_id}/{img_id}.png"
        images.append({
            "id": img_id,
            "source_page": page_num,
            "path": rel_path,
            "description": fig.get("description", ""),
            "type": fig.get("type", "diagram"),
            "width": None,
            "height": None,
        })

    # Build questions array from exercises (unified format uses `questions`).
    # Type-specific fields:
    #   mcq        → options[], correct_index
    #   numerical  → answer (string)
    #   conceptual → answer (string)
    #   true_false → is_true (boolean) — converted from VLM string "true"/"false"
    questions: list[dict] = []
    for ex in merged["exercises"]:
        q_type = ex.get("type", "conceptual")
        q = {
            "id": ex.get("id", f"q-{len(questions) + 1:03d}"),
            "type": q_type,
            "difficulty": ex.get("difficulty", "medium"),
            "question": ex.get("question", ""),
            "explanation": ex.get("explanation", ""),
            "formula_used": ex.get("formula_used", ""),
        }
        if q_type == "mcq":
            q["options"] = ex.get("options", [])
            q["correct_index"] = ex.get("correct_index")
        elif q_type == "true_false":
            raw_ans = ex.get("answer")
            if isinstance(raw_ans, bool):
                q["is_true"] = raw_ans
            elif isinstance(raw_ans, str):
                q["is_true"] = raw_ans.strip().lower() in ("true", "1", "صح", "صحيح", "نعم")
            else:
                q["is_true"] = True
        else:
            # numerical or conceptual
            q["answer"] = ex.get("answer")
        questions.append(q)

    # Convert worked examples into `explanations` (per lesson.template.json).
    # The dashboard's LessonContent only has `explanations` (no `examples`),
    # so we map each worked example to an explanation entry.
    explanations: list[dict] = []
    for idx, ex in enumerate(merged["content"]["examples"], start=1):
        ex_id = ex.get("id") or f"exp-{idx:03d}"
        title = (ex.get("question") or "مثال محلول")[:80]
        steps = ex.get("solution_steps") or []
        answer = ex.get("final_answer") or ""
        text_parts = []
        if ex.get("question"):
            text_parts.append(ex["question"])
        if steps:
            text_parts.append("خطوات الحل:")
            text_parts.extend(f"{i + 1}. {s}" for i, s in enumerate(steps))
        if answer:
            text_parts.append(f"الإجابة: {answer}")
        explanations.append({
            "id": ex_id,
            "title": title,
            "text": "\n".join(text_parts),
            "image_id": None,
            "order": idx,
        })

    # Build scenes — use formula/question ids we just generated
    scenes = list(DEFAULT_SCENES)
    if merged["content"]["formulas"]:
        scenes[2] = {**scenes[2], "formula_id": merged["content"]["formulas"][0]["id"]}
    if questions:
        scenes[5] = {**scenes[5], "question_ids": [q["id"] for q in questions[:3]]}
    # Update scene 1 title to lesson title
    scenes[1] = {**scenes[1], "title": title}

    lesson = {
        "metadata": {
            "book_id": book_id,
            "unit_id": group["unit_id"],
            "lesson_id": lesson_id,
            "title": title,
            "subtitle": "",
            "page_start": merged["page_start"],
            "page_end": merged["page_end"],
            "subject": book_meta.get("subject", "physics"),
            "grade": book_meta.get("grade", "3rd-secondary"),
            "duration_minutes": 8,
            "difficulty": "medium",
            "created_at": now,
            "updated_at": now,
        },
        "content": {
            "raw_text": merged["content"]["raw_text"],
            "summary": merged["content"]["summary"],
            "objectives": merged["content"]["objectives"],
            "definitions": merged["content"]["definitions"],
            "formulas": merged["content"]["formulas"],
            "explanations": explanations,
        },
        "images": images,
        "tables": merged["tables"],
        "questions": questions,
        "scenes": scenes,
        "video": {
            "status": "not_generated",
            "script_text": "",
            "voice": "ar-EG-SalmaNeural",
            "video_url": None,
            "thumbnail_url": None,
            "duration_sec": sum(s.get("duration_sec", 0) for s in scenes),
            "rendered_at": None,
            "render_log": None,
            "file_size_mb": None,
        },
        "extraction_meta": {
            "extracted_at": now,
            "model": model,
            "confidence": merged["average_confidence"],
            "needs_review": merged["needs_review"],
            "review_notes": "; ".join(
                f"page {lp['page']} conf={lp['confidence']}"
                for lp in merged["low_confidence_pages"]
            ) if merged["low_confidence_pages"] else "",
        },
    }
    return lesson


# =============================================================================
# Master JSON Builder
# =============================================================================

def build_master_json(
    book_id: str,
    book_meta: dict,
    groups: list[dict],
    merged_lessons: list[dict],
) -> dict:
    """Build the master.json object matching master.template.json schema."""
    now = datetime.now().isoformat()

    # Group lessons by unit
    units_map: dict[str, dict] = {}
    for g, merged in zip(groups, merged_lessons):
        uid = g["unit_id"]
        if uid not in units_map:
            units_map[uid] = {
                "id": uid,
                "title": g.get("unit_title") or f"Unit {g['unit_order']}",
                "order": g["unit_order"],
                "page_start": merged["page_start"],
                "page_end": merged["page_end"],
                "lessons": [],
            }
        else:
            # Expand unit page range
            units_map[uid]["page_start"] = min(
                units_map[uid]["page_start"] or 999999, merged["page_start"] or 999999
            )
            units_map[uid]["page_end"] = max(
                units_map[uid]["page_end"] or 0, merged["page_end"] or 0
            )

        needs_review = merged["needs_review"]
        units_map[uid]["lessons"].append({
            "id": g["lesson_id"],
            "title": g.get("lesson_title") or g["lesson_id"],
            "page_start": merged["page_start"],
            "page_end": merged["page_end"],
            "status": "extracted",
            "lesson_file": f"lessons/{g['lesson_id']}.json",
            "video_status": "not_generated",
        })

    units = sorted(units_map.values(), key=lambda u: u["order"])

    # Stats
    total_lessons = sum(len(u["lessons"]) for u in units)
    extracted_lessons = total_lessons  # all generated lessons are 'extracted'

    # Preserve existing master fields if present (e.g. source_pdf from createBook)
    existing_master = book_meta.get("__existing_master__", {}) or {}

    book_obj = {
        "id": book_id,
        "title": book_meta.get("title") or existing_master.get("book", {}).get("title", book_id),
        "subject": book_meta.get("subject") or existing_master.get("book", {}).get("subject", "physics"),
        "grade": book_meta.get("grade") or existing_master.get("book", {}).get("grade", "3rd-secondary"),
        "publisher": book_meta.get("publisher") or existing_master.get("book", {}).get("publisher", ""),
        "source_pdf": book_meta.get("source_pdf") or existing_master.get("book", {}).get("source_pdf", f"books/{book_id}.pdf"),
        "total_pages": book_meta.get("total_pages") or existing_master.get("book", {}).get("total_pages", 0),
        "cover_image": existing_master.get("book", {}).get("cover_image"),
        "created_at": existing_master.get("book", {}).get("created_at") or now,
        "updated_at": now,
        "extraction_status": "completed",
        "extraction_progress": 100,
    }

    master = {
        "book": book_obj,
        "units": units,
        "stats": {
            "total_units": len(units),
            "total_lessons": total_lessons,
            "extracted_lessons": extracted_lessons,
            "videos_generated": 0,
            "videos_pending": 0,
        },
    }
    return master


# =============================================================================
# Image Copying
# =============================================================================

def copy_lesson_images(
    groups: list[dict],
    merged_lessons: list[dict],
    images_src_dir: str | None,
    output_book_dir: str,
) -> int:
    """
    Copy source page PNGs to data/books/{bookId}/images/{lessonId}/img-NNN.png
    for each lesson. Returns the number of images copied.

    If images_src_dir is None or doesn't exist, this is a no-op (the lesson.json
    will still reference the expected paths; user can drop images in later).
    """
    if not images_src_dir or not os.path.isdir(images_src_dir):
        return 0

    copied = 0
    for group, merged in zip(groups, merged_lessons):
        lesson_id = group["lesson_id"]
        lesson_img_dir = os.path.join(output_book_dir, "images", lesson_id)
        os.makedirs(lesson_img_dir, exist_ok=True)

        # Copy one image per figure (and per page if no figures detected)
        pages_to_copy = merged["pages_processed"]
        if not pages_to_copy:
            continue

        # If the lesson has figures, copy only those pages; else copy all lesson pages
        figures = merged["figures"]
        if figures and len(figures) <= len(pages_to_copy):
            # Map figures to pages in order
            pages_for_figures = pages_to_copy[: len(figures)]
        else:
            pages_for_figures = pages_to_copy

        for idx, page_num in enumerate(pages_for_figures, start=1):
            src = os.path.join(images_src_dir, f"page_{page_num:04d}.png")
            if not os.path.exists(src):
                # Try without zero-padding
                alt = os.path.join(images_src_dir, f"page_{page_num}.png")
                if os.path.exists(alt):
                    src = alt
                else:
                    continue
            dst = os.path.join(lesson_img_dir, f"img-{idx:03d}.png")
            try:
                shutil.copy2(src, dst)
                copied += 1
            except OSError as e:
                print(f"  ⚠️  Failed to copy {src} → {dst}: {e}")

    return copied


# =============================================================================
# Existing Master Loader
# =============================================================================

def load_existing_master(output_book_dir: str) -> dict | None:
    """Load an existing master.json from the output dir (if present)."""
    master_path = os.path.join(output_book_dir, "master.json")
    if not os.path.exists(master_path):
        return None
    try:
        with open(master_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        print(f"  ⚠️  Could not load existing master.json: {e}")
        return None


# =============================================================================
# JSON Writer (UTF-8, ensure_ascii=False)
# =============================================================================

def write_json_utf8(path: str, data: Any) -> None:
    """Write JSON file with UTF-8 encoding and ensure_ascii=False."""
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# =============================================================================
# Main Pipeline
# =============================================================================

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate master.json + lesson.json files in the unified Video Factory format"
    )
    parser.add_argument(
        "--book-id", "-b",
        required=True,
        help="Book identifier (e.g. 'physics-3rd-secondary')",
    )
    parser.add_argument(
        "--input", "-i",
        required=True,
        help="Directory containing page_XXXX.json (raw-json/) OR lesson-*.json (merged-lessons/)",
    )
    parser.add_argument(
        "--input-format",
        choices=["raw", "merged"],
        default="raw",
        help="Input format: 'raw' = page_XXXX.json files, 'merged' = lesson-*.json (default: raw)",
    )
    parser.add_argument(
        "--output", "-o",
        default=None,
        help="Output book directory (default: ../../data/books/{book-id}/)",
    )
    parser.add_argument(
        "--book-index",
        default=None,
        help="Optional path to book-index.json for explicit page→lesson mapping",
    )
    parser.add_argument(
        "--images-dir",
        default=None,
        help="Optional directory of source PNG page images to copy into the book's images/ folder",
    )
    parser.add_argument(
        "--model", "-m",
        default="qwen2-vl:7b",
        help="VLM model name to record in extraction_meta (default: qwen2-vl:7b)",
    )
    parser.add_argument(
        "--book-title",
        default=None,
        help="Override book title (default: use existing master.json or book-id)",
    )
    parser.add_argument(
        "--book-subject",
        default="physics",
        help="Book subject (default: physics)",
    )
    parser.add_argument(
        "--book-grade",
        default="3rd-secondary",
        help="Book grade (default: 3rd-secondary)",
    )
    parser.add_argument(
        "--book-publisher",
        default="",
        help="Book publisher (default: empty)",
    )
    parser.add_argument(
        "--total-pages",
        type=int,
        default=0,
        help="Total pages in source PDF (default: 0)",
    )
    parser.add_argument(
        "--source-pdf",
        default=None,
        help="Path to source PDF (recorded in master.json)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing lesson.json files even if they exist",
    )
    parser.add_argument(
        "--keep-existing-lessons",
        action="store_true",
        help="Do not overwrite lesson.json files that already exist (skip them)",
    )

    args = parser.parse_args()

    # Resolve paths
    output_book_dir = args.output or os.path.join(DEFAULT_BOOKS_DIR, args.book_id)
    output_book_dir = os.path.abspath(output_book_dir)
    lessons_dir = os.path.join(output_book_dir, "lessons")
    images_dir = os.path.join(output_book_dir, "images")

    os.makedirs(lessons_dir, exist_ok=True)
    os.makedirs(images_dir, exist_ok=True)

    print(f"""
╔══════════════════════════════════════════════════════════════╗
║        📚 Master Generator — Unified Video Factory          ║
╠══════════════════════════════════════════════════════════════╣
║  Book ID:    {args.book_id:<48}║
║  Input:      {args.input:<48}║
║  Format:     {args.input_format:<48}║
║  Output:     {output_book_dir[:48]:<48}║
║  Model:      {args.model:<48}║
╚══════════════════════════════════════════════════════════════╝
""")

    # -------------------------------------------------------------------------
    # Step 1: Load input pages
    # -------------------------------------------------------------------------
    if args.input_format == "raw":
        page_paths = list_page_files(args.input)
        if not page_paths:
            print(f"❌ No page_XXXX.json files found in: {args.input}")
            return 1
        print(f"📄 Found {len(page_paths)} raw page JSON files")
        pages = []
        for p in page_paths:
            data = load_page(p)
            if data is not None:
                pages.append(data)
        print(f"   Loaded {len(pages)} valid page records")
    else:
        # Merged format: each lesson-*.json has lesson_id + content arrays
        if not os.path.isdir(args.input):
            print(f"❌ Input directory not found: {args.input}")
            return 1
        merged_files = sorted(
            f for f in os.listdir(args.input)
            if f.startswith("lesson-") and f.endswith(".json")
        )
        if not merged_files:
            print(f"❌ No lesson-*.json files found in: {args.input}")
            return 1
        print(f"📄 Found {len(merged_files)} merged lesson JSON files")
        # Convert each merged lesson into a synthetic page so we can reuse the
        # merge logic. Each merged file becomes a single "page" with its
        # arrays intact and lesson_id taken from the file.
        # Note: merged-lessons format (from merge-pages.py) doesn't carry
        # `status`/`page_type` fields, so we set them so is_successful() passes.
        pages = []
        for fname in merged_files:
            with open(os.path.join(args.input, fname), "r", encoding="utf-8") as f:
                lesson = json.load(f)
            lid = lesson.get("lesson_id") or fname.replace(".json", "")
            # If this merged lesson already has multiple pages_processed, expand them
            pages_processed = lesson.get("pages_processed") or []
            if pages_processed:
                for pn in pages_processed:
                    synthetic = dict(lesson)
                    synthetic["page_number"] = pn
                    synthetic["lesson_id"] = lid
                    synthetic["status"] = synthetic.get("status") or "success"
                    synthetic["page_type"] = synthetic.get("page_type") or "lesson"
                    pages.append(synthetic)
            else:
                synthetic = dict(lesson)
                synthetic["lesson_id"] = lid
                if not synthetic.get("page_number"):
                    synthetic["page_number"] = len(pages) + 1
                synthetic["status"] = synthetic.get("status") or "success"
                synthetic["page_type"] = synthetic.get("page_type") or "lesson"
                pages.append(synthetic)

    if not pages:
        print("❌ No usable page data found")
        return 1

    # -------------------------------------------------------------------------
    # Step 2: Load existing master.json (if any) to preserve book metadata
    # -------------------------------------------------------------------------
    existing_master = load_existing_master(output_book_dir)
    if existing_master:
        print(f"📖 Found existing master.json — will preserve book metadata")

    # -------------------------------------------------------------------------
    # Step 3: Load book-index (if provided or at default location)
    # -------------------------------------------------------------------------
    book_index = None
    index_path = args.book_index or DEFAULT_INDEX
    if index_path and os.path.exists(index_path):
        try:
            with open(index_path, "r", encoding="utf-8") as f:
                book_index = json.load(f)
            print(f"🔖 Loaded book-index from {index_path}")
        except (json.JSONDecodeError, OSError) as e:
            print(f"⚠️  Could not load book-index at {index_path}: {e}")
            book_index = None
    elif args.book_index:
        print(f"⚠️  Book-index not found at {args.book_index}")

    # -------------------------------------------------------------------------
    # Step 4: Group pages into lessons
    # -------------------------------------------------------------------------
    groups = group_pages_into_lessons(pages, book_index)
    if not groups:
        print("❌ No lessons detected from input pages")
        return 1

    total_lessons = len(groups)
    total_units = len({g["unit_id"] for g in groups})
    print(f"🧩 Detected {total_lessons} lessons across {total_units} units")

    # -------------------------------------------------------------------------
    # Step 5: Merge content per lesson
    # -------------------------------------------------------------------------
    merged_lessons = []
    for g in groups:
        merged = merge_lesson_content(g)
        merged_lessons.append(merged)
        stats = {
            "defs": len(merged["content"]["definitions"]),
            "formulas": len(merged["content"]["formulas"]),
            "examples": len(merged["content"]["examples"]),
            "exercises": len(merged["exercises"]),
            "tables": len(merged["tables"]),
            "figures": len(merged["figures"]),
            "pages": len(merged["pages_processed"]),
            "conf": merged["average_confidence"],
        }
        review_flag = " ⚠️ review" if merged["needs_review"] else ""
        print(f"   • {g['lesson_id']} [{g['unit_id']}] "
              f"({g.get('lesson_title', '')[:30]}) "
              f"defs={stats['defs']} formulas={stats['formulas']} "
              f"ex={stats['exercises']} conf={stats['conf']}{review_flag}")

    # -------------------------------------------------------------------------
    # Step 6: Build lesson.json files
    # -------------------------------------------------------------------------
    book_meta = {
        "title": args.book_title or (existing_master or {}).get("book", {}).get("title") or args.book_id,
        "subject": args.book_subject,
        "grade": args.book_grade,
        "publisher": args.book_publisher,
        "source_pdf": args.source_pdf or (existing_master or {}).get("book", {}).get("source_pdf"),
        "total_pages": args.total_pages or (existing_master or {}).get("book", {}).get("total_pages", 0),
        "__existing_master__": existing_master,
    }

    print(f"\n📝 Writing lesson.json files to {lessons_dir}")
    written_lessons = 0
    skipped_lessons = 0
    for group, merged in zip(groups, merged_lessons):
        lesson_path = os.path.join(lessons_dir, f"{group['lesson_id']}.json")
        if os.path.exists(lesson_path) and not args.force:
            if args.keep_existing_lessons:
                print(f"   ⏭️  {group['lesson_id']} — exists, skipping (--keep-existing-lessons)")
                skipped_lessons += 1
                continue
            else:
                print(f"   ♻️  {group['lesson_id']} — overwriting (use --keep-existing-lessons to skip)")

        lesson = build_lesson_json(args.book_id, group, merged, book_meta, args.model)
        write_json_utf8(lesson_path, lesson)
        written_lessons += 1

    print(f"   ✅ Wrote {written_lessons} lesson files, skipped {skipped_lessons}")

    # -------------------------------------------------------------------------
    # Step 7: Copy source page images to images/{lessonId}/
    # -------------------------------------------------------------------------
    if args.images_dir:
        print(f"\n🖼️  Copying source images from {args.images_dir}")
        copied = copy_lesson_images(groups, merged_lessons, args.images_dir, output_book_dir)
        print(f"   ✅ Copied {copied} images")
    else:
        print(f"\n🖼️  No --images-dir provided; skipping image copy")

    # -------------------------------------------------------------------------
    # Step 8: Build and write master.json
    # -------------------------------------------------------------------------
    master = build_master_json(args.book_id, book_meta, groups, merged_lessons)
    master_path = os.path.join(output_book_dir, "master.json")
    print(f"\n📋 Writing master.json to {master_path}")
    write_json_utf8(master_path, master)
    print(f"   ✅ master.json — units={master['stats']['total_units']} "
          f"lessons={master['stats']['total_lessons']} "
          f"status={master['book']['extraction_status']}")

    # -------------------------------------------------------------------------
    # Final Summary
    # -------------------------------------------------------------------------
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║                   🎉 Master Generation Complete!            ║
╠══════════════════════════════════════════════════════════════╣
║  Book:          {args.book_id:<45}║
║  Units:         {master['stats']['total_units']:<45}║
║  Lessons:       {master['stats']['total_lessons']:<45}║
║  Extracted:     {master['stats']['extracted_lessons']:<45}║
║  Status:        {master['book']['extraction_status']:<45}║
║                                                              ║
║  Output:                                                      ║
║    📁 master.json    {master_path[:43]:<43}║
║    📁 lessons/       {lessons_dir[:43]:<43}║
║    📁 images/        {images_dir[:43]:<43}║
╚══════════════════════════════════════════════════════════════╝
""")
    return 0


if __name__ == "__main__":
    sys.exit(main())
