#!/usr/bin/env python3
"""
Page Merger: JSON Pages → Lesson JSON
=======================================
Merges per-page VLM extraction JSONs into unified lesson JSON files
based on the book-index.json page-to-lesson mapping.

Features:
- Merges all page JSONs for each lesson
- Concatenates raw_text and key_points
- Merges formulas, examples, exercises, definitions
- Detects and removes duplicates
- Generates lesson-level summary
- Flags low-confidence pages for human review

Usage:
    python merge-pages.py --index "config/book-index.json" --input "raw-json/" --output "merged-lessons/"
    python merge-pages.py --index "config/book-index.json" --input "raw-json/" --output "merged-lessons/" --force
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Fix Windows console encoding issues for emoji printing
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

def load_pipeline_config() -> dict:
    """Load the pipeline configuration from pipeline-config.json."""
    config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "config", "pipeline-config.json")
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️  Warning: Failed to load pipeline-config.json: {e}")
    return {}

# Load centralized config
_config = load_pipeline_config()
_merge_config = _config.get("stage_3_merger", {})
CONFIDENCE_THRESHOLD = _merge_config.get("confidence_threshold", 0.6)
FLAG_NEEDS_REVIEW = _merge_config.get("flag_needs_review", True)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_INDEX = os.path.join(SCRIPT_DIR, "..", "config", "book-index.json")


# =============================================================================
# Page Loading
# =============================================================================

def load_page_json(input_dir: str, page_number: int) -> dict | None:
    """Load a single page's JSON extraction result."""
    filepath = os.path.join(input_dir, f"page_{page_number:04d}.json")
    if not os.path.exists(filepath):
        return None

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"  ⚠️  Failed to load page {page_number}: {e}")
        return None


def is_successful(page_data: dict) -> bool:
    """Check if a page extraction was successful."""
    return (
        page_data is not None
        and page_data.get("status") == "success"
        and page_data.get("page_type") not in ("empty", "unclear", None)
    )


# =============================================================================
# Merging Logic
# =============================================================================

def deduplicate_items(items: list, key_field: str) -> list:
    """Remove duplicate items based on a key field."""
    seen = set()
    unique = []
    for item in items:
        key = item.get(key_field, "")
        if isinstance(key, str):
            key = key.strip()
        if key and key not in seen:
            seen.add(key)
            unique.append(item)
        elif not key:
            unique.append(item)
    return unique


def deduplicate_formulas(formulas: list) -> list:
    """Remove duplicate formulas based on formula_latex."""
    seen = set()
    unique = []
    for f in formulas:
        latex = f.get("formula_latex", "").strip()
        if latex and latex not in seen:
            seen.add(latex)
            unique.append(f)
        elif not latex:
            unique.append(f)
    return unique


def calculate_average_confidence(pages: list) -> float:
    """Calculate average confidence across all pages."""
    confidences = [
        p.get("confidence", 0)
        for p in pages
        if p.get("confidence") is not None
    ]
    if not confidences:
        return 0.0
    return round(sum(confidences) / len(confidences), 3)


def find_low_confidence_pages(pages: list, threshold: float = CONFIDENCE_THRESHOLD) -> list:
    """Find pages with confidence below threshold."""
    low_conf = []
    for p in pages:
        conf = p.get("confidence")
        if conf is not None and conf < threshold:
            low_conf.append({
                "page": p.get("page_number"),
                "confidence": conf,
                "notes": p.get("notes", "")
            })
    return low_conf


def merge_pages_into_lesson(
    lesson_id: str,
    lesson_title: str,
    page_numbers: list,
    input_dir: str
) -> dict:
    """
    Merge multiple page JSONs into a single lesson JSON.
    
    Args:
        lesson_id: Lesson identifier (e.g., "lesson-01")
        lesson_title: Lesson title in Arabic
        page_numbers: List of page numbers to merge
        input_dir: Directory containing page JSON files
        
    Returns:
        Merged lesson dict
    """
    # Load all pages
    all_pages = []
    for page_num in page_numbers:
        page_data = load_page_json(input_dir, page_num)
        if page_data is not None:
            all_pages.append(page_data)

    if not all_pages:
        return {
            "lesson_id": lesson_id,
            "title": lesson_title,
            "status": "empty",
            "error": "No page data found",
            "pages_expected": page_numbers,
            "timestamp": datetime.now().isoformat()
        }

    successful_pages = [p for p in all_pages if is_successful(p)]
    failed_pages = [p for p in all_pages if not is_successful(p)]

    # Merge content arrays
    all_definitions = []
    all_formulas = []
    all_examples = []
    all_exercises = []
    all_tables = []
    all_figures = []
    all_key_points = []
    all_raw_text_parts = []

    for page in successful_pages:
        all_definitions.extend(page.get("definitions", []))
        all_formulas.extend(page.get("formulas", []))
        all_examples.extend(page.get("examples", []))
        all_exercises.extend(page.get("exercises", []))
        all_tables.extend(page.get("tables", []))
        all_figures.extend(page.get("figures", []))
        all_key_points.extend(page.get("key_points", []))

        raw_text = page.get("raw_text", "")
        if raw_text:
            all_raw_text_parts.append(raw_text)

    # Deduplicate
    all_definitions = deduplicate_items(all_definitions, "term")
    all_formulas = deduplicate_formulas(all_formulas)
    all_examples = deduplicate_items(all_examples, "question")
    all_exercises = deduplicate_items(all_exercises, "question")
    all_key_points = list(dict.fromkeys(all_key_points))  # Preserve order, remove dupes

    # Merge content summaries
    summaries = [
        p.get("content_summary", "")
        for p in successful_pages
        if p.get("content_summary")
    ]
    merged_summary = " ".join(summaries) if summaries else ""

    # Determine lesson_title from pages if not provided
    if not lesson_title:
        for page in successful_pages:
            if page.get("lesson_title"):
                lesson_title = page["lesson_title"]
                break

    # Calculate confidence stats
    avg_confidence = calculate_average_confidence(successful_pages)
    low_confidence = find_low_confidence_pages(successful_pages)

    # Build merged lesson
    lesson = {
        "lesson_id": lesson_id,
        "title": lesson_title,
        "status": "success" if successful_pages else "failed",
        "content_summary": merged_summary,
        "definitions": all_definitions,
        "formulas": all_formulas,
        "examples": all_examples,
        "exercises": all_exercises,
        "tables": all_tables,
        "figures": all_figures,
        "key_points": all_key_points,
        "raw_text": "\n\n".join(all_raw_text_parts),
        "statistics": {
            "total_pages_expected": len(page_numbers),
            "pages_successful": len(successful_pages),
            "pages_failed": len(failed_pages),
            "average_confidence": avg_confidence,
            "definitions_count": len(all_definitions),
            "formulas_count": len(all_formulas),
            "examples_count": len(all_examples),
            "exercises_count": len(all_exercises),
            "tables_count": len(all_tables),
            "figures_count": len(all_figures),
        },
        "needs_review": (len(low_confidence) > 0 or avg_confidence < CONFIDENCE_THRESHOLD) if FLAG_NEEDS_REVIEW else False,
        "low_confidence_pages": low_confidence,
        "failed_pages": [
            {"page": p.get("page_number"), "error": p.get("error", "Unknown")}
            for p in failed_pages
        ],
        "pages_processed": page_numbers,
        "timestamp": datetime.now().isoformat()
    }

    return lesson


# =============================================================================
# Book Index Loading
# =============================================================================

def load_book_index(index_path: str) -> dict:
    """Load the book index configuration."""
    with open(index_path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_all_lessons(book_index: dict) -> list:
    """
    Extract all lessons from the book index.
    Returns list of (lesson_id, lesson_title, chapter_id, chapter_name, page_numbers) tuples.
    """
    lessons = []
    for chapter in book_index.get("chapters", []):
        chapter_id = chapter.get("id", "")
        chapter_name = chapter.get("name", "")
        for lesson in chapter.get("lessons", []):
            lessons.append({
                "lesson_id": lesson.get("id", ""),
                "title": lesson.get("title", ""),
                "chapter_id": chapter_id,
                "chapter_name": chapter_name,
                "pages": lesson.get("pages", [])
            })
    return lessons


# =============================================================================
# Main Pipeline
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Merge per-page VLM extractions into lesson JSON files"
    )
    parser.add_argument(
        "--index", "-idx",
        default=DEFAULT_INDEX,
        help=f"Path to book-index.json (default: {DEFAULT_INDEX})"
    )
    parser.add_argument(
        "--input", "-i",
        default="raw-json/",
        help="Directory containing per-page JSON files (default: raw-json/)"
    )
    parser.add_argument(
        "--output", "-o",
        default="merged-lessons/",
        help="Output directory for merged lesson files (default: merged-lessons/)"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-merge all lessons even if output exists"
    )

    args = parser.parse_args()

    # Validate inputs
    if not os.path.exists(args.index):
        print(f"❌ Book index not found: {args.index}")
        sys.exit(1)

    if not os.path.exists(args.input):
        print(f"❌ Input directory not found: {args.input}")
        sys.exit(1)

    # Create output directory
    os.makedirs(args.output, exist_ok=True)

    # Load book index
    book_index = load_book_index(args.index)
    book_name = book_index.get("book", "Unknown Book")
    lessons = get_all_lessons(book_index)

    print(f"📚 Book: {book_name}")
    print(f"📖 Total lessons: {len(lessons)}")

    # Merge each lesson
    start_time = datetime.now()
    success_count = 0
    review_count = 0
    empty_count = 0

    for lesson_info in lessons:
        lesson_id = lesson_info["lesson_id"]
        title = lesson_info["title"]
        pages = lesson_info["pages"]
        chapter_id = lesson_info["chapter_id"]

        print(f"\n  📝 Merging {lesson_id}: {title}")
        print(f"     Pages: {pages}")

        # Check if already exists
        output_path = os.path.join(args.output, f"{lesson_id}.json")
        if not args.force and os.path.exists(output_path):
            print(f"     ⏭️  Already exists (use --force to re-merge)")
            continue

        # Merge pages
        lesson = merge_pages_into_lesson(lesson_id, title, pages, args.input)

        # Add chapter metadata
        lesson["chapter_id"] = chapter_id
        lesson["subject"] = book_index.get("subject", "")
        lesson["grade"] = book_index.get("grade", "")
        lesson["term"] = book_index.get("term", "")
        lesson["book_name"] = book_name

        # Save merged lesson
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(lesson, f, ensure_ascii=False, indent=2)

        stats = lesson.get("statistics", {})
        avg_conf = stats.get("average_confidence", 0)

        if lesson.get("status") == "empty":
            empty_count += 1
            print(f"     ❌ No data found for this lesson")
        elif lesson.get("needs_review"):
            review_count += 1
            print(f"     ⚠️  Saved (needs review) - avg confidence: {avg_conf}")
            print(f"        Low confidence pages: {lesson.get('low_confidence_pages', [])}")
        else:
            success_count += 1
            print(f"     ✅ Saved - {stats.get('formulas_count', 0)} formulas, "
                  f"{stats.get('examples_count', 0)} examples, "
                  f"{stats.get('exercises_count', 0)} exercises")
            print(f"        Avg confidence: {avg_conf}")

    # Summary
    elapsed = (datetime.now() - start_time).total_seconds()
    total = len(lessons)
    print(f"\n{'='*60}")
    print(f"🎉 Merge complete!")
    print(f"   ✅ Success: {success_count}/{total}")
    print(f"   ⚠️  Review needed: {review_count}")
    print(f"   ❌ Empty: {empty_count}")
    print(f"   ⏱️  Time: {elapsed:.1f}s")
    print(f"   📁 Output: {args.output}")

    return 0


if __name__ == "__main__":
    sys.exit(main())