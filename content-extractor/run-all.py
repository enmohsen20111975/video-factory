#!/usr/bin/env python3
"""
One-Click Pipeline Runner — Unified Video Factory
==================================================
Runs all 4 stages of the content extraction pipeline in sequence and writes
the final master.json + lesson.json files into the unified book directory.

Stages:
  1. PDF → Images (pdf-to-images.py)
  2. Images → Per-page JSON via VLM (extract-page.py)
  3. Per-page JSON → Merged lesson JSON (merge-pages.py) [optional]
  4. Merged/Raw JSON → master.json + lesson.json (generate-master.py)

Two invocation modes:

  Mode A (NEW, recommended) — by book-id:
    python run-all.py --book-id "physics-3rd-secondary"

    Reads `data/books/{bookId}/master.json` for source_pdf + metadata,
    stages outputs under `data/books/{bookId}/`, updates extraction_status
    and extraction_progress at each stage, and logs to
    `data/books/{bookId}/extraction.log`.

  Mode B (LEGACY) — by --pdf path:
    python run-all.py --pdf "books/physics-moaser.pdf"

    Preserved for backwards compatibility. Outputs go under
    `content-extractor/temp/`, `raw-json/`, `merged-lessons/`.

Optional flags:
    --model "qwen2.5vl:7b"     Override VLM model
    --cooldown 10             Cooldown between pages (seconds)
    --skip-convert            Skip stage 1
    --skip-extraction         Skip stage 2
    --skip-merge              Skip stage 3
    --skip-generate           Skip stage 4
    --only-step N             Run only one step (1-4)
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

# Fix Windows console encoding for emoji printing
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SCRIPTS_DIR = os.path.join(SCRIPT_DIR, "scripts")
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
BOOKS_DIR = os.path.join(DATA_DIR, "books")


# =============================================================================
# Config Loading
# =============================================================================

def load_pipeline_config() -> dict:
    """Load the active pipeline-config.json (prefers data/config/)."""
    candidates = [
        os.path.join(DATA_DIR, "config", "pipeline-config.json"),
        os.path.join(SCRIPT_DIR, "config", "pipeline-config.json"),
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"⚠️  Warning: Failed to load {p}: {e}")
    return {}


# =============================================================================
# Logging
# =============================================================================

class BookLogger:
    """Append-only logger that writes to a file and stdout."""

    def __init__(self, log_path: str | None):
        self.log_path = log_path
        if log_path:
            os.makedirs(os.path.dirname(os.path.abspath(log_path)), exist_ok=True)
            self._fh = open(log_path, "a", encoding="utf-8")
            self._fh.write(f"\n\n=== Run started at {datetime.now().isoformat()} ===\n")
        else:
            self._fh = None

    def log(self, msg: str) -> None:
        print(msg)
        if self._fh:
            self._fh.write(msg + "\n")
            self._fh.flush()

    def close(self) -> None:
        if self._fh:
            self._fh.write(f"=== Run ended at {datetime.now().isoformat()} ===\n")
            self._fh.close()


# =============================================================================
# Book master.json helpers
# =============================================================================

def load_master(book_id: str) -> dict | None:
    """Load master.json for a book (or None if missing)."""
    master_path = os.path.join(BOOKS_DIR, book_id, "master.json")
    if not os.path.exists(master_path):
        return None
    try:
        with open(master_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        print(f"⚠️  Could not read {master_path}: {e}")
        return None


def save_master(book_id: str, master: dict) -> None:
    """Persist master.json (UTF-8, ensure_ascii=False)."""
    master_path = os.path.join(BOOKS_DIR, book_id, "master.json")
    os.makedirs(os.path.dirname(master_path), exist_ok=True)
    with open(master_path, "w", encoding="utf-8") as f:
        json.dump(master, f, ensure_ascii=False, indent=2)


def update_extraction_progress(
    book_id: str,
    status: str,
    progress: int,
    logger: BookLogger,
) -> None:
    """Update extraction_status and extraction_progress in master.json."""
    master = load_master(book_id)
    if not master:
        logger.log(f"  ⚠️  Cannot update progress — master.json not found for book '{book_id}'")
        return
    master.setdefault("book", {})["extraction_status"] = status
    master["book"]["extraction_progress"] = int(progress)
    master["book"]["updated_at"] = datetime.now().isoformat()
    save_master(book_id, master)
    logger.log(f"  📊 Progress: {status} ({progress}%)")


# =============================================================================
# Source PDF resolution
# =============================================================================

def resolve_source_pdf(book_id: str, master: dict | None) -> str | None:
    """Find the PDF file for a book (checks multiple locations)."""
    candidates: list[str] = []
    if master:
        sp = master.get("book", {}).get("source_pdf")
        if sp:
            # Try as-is (relative to project root) and absolute
            candidates.append(sp if os.path.isabs(sp) else os.path.join(PROJECT_ROOT, sp))
    # Common per-book locations
    book_dir = os.path.join(BOOKS_DIR, book_id)
    candidates.extend([
        os.path.join(book_dir, "source.pdf"),
        os.path.join(book_dir, f"{book_id}.pdf"),
        os.path.join(PROJECT_ROOT, "books", f"{book_id}.pdf"),
    ])
    for c in candidates:
        if os.path.exists(c):
            return os.path.abspath(c)
    return None


# =============================================================================
# Step Runner
# =============================================================================

def run_step(
    step_num: int,
    description: str,
    command: list[str],
    logger: BookLogger,
    cwd: str = SCRIPTS_DIR,
) -> bool:
    """Run a pipeline step, streaming output to the logger."""
    logger.log(f"\n{'=' * 70}")
    logger.log(f"  STAGE {step_num}: {description}")
    logger.log(f"{'=' * 70}\n")

    start_time = time.time()
    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            timeout=None,  # No timeout — these can take hours
            check=False,
        )
        elapsed = time.time() - start_time
        if result.returncode == 0:
            logger.log(f"\n  ✅ Stage {step_num} completed in {elapsed:.1f}s")
            return True
        else:
            logger.log(f"\n  ❌ Stage {step_num} failed with return code {result.returncode}")
            return False
    except subprocess.TimeoutExpired:
        logger.log(f"\n  ❌ Stage {step_num} timed out")
        return False
    except KeyboardInterrupt:
        logger.log(f"\n  ⚠️ Stage {step_num} interrupted by user")
        logger.log(f"  💡 You can resume by running this script again.")
        return False
    except Exception as e:
        logger.log(f"\n  ❌ Stage {step_num} error: {e}")
        return False


# =============================================================================
# Main
# =============================================================================

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run the complete content extraction pipeline (Unified Video Factory)"
    )
    config = load_pipeline_config()
    vlm_config = config.get("stage_2_vlm_extraction", {})
    default_model = vlm_config.get("preferred_model", "qwen2.5vl:7b")
    default_cooldown = vlm_config.get("cooldown_seconds", 10)

    # Mode A: by book-id (new)
    parser.add_argument(
        "--book-id", "-b",
        default=None,
        help="Book ID (e.g. 'physics-3rd-secondary') — uses data/books/{bookId}/master.json",
    )
    # Mode B: by pdf (legacy)
    parser.add_argument(
        "--pdf", "-p",
        default=None,
        help="(Legacy) Path to the input PDF file",
    )
    parser.add_argument(
        "--model", "-m",
        default=default_model,
        help=f"Ollama model for VLM extraction (default: {default_model})",
    )
    parser.add_argument(
        "--index",
        default=None,
        help="Path to book-index.json (default: config/book-index.json if exists)",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="(Legacy mode) Final output directory",
    )
    parser.add_argument(
        "--cooldown",
        type=int,
        default=default_cooldown,
        help=f"Cooldown between VLM pages in seconds (default: {default_cooldown})",
    )

    # Skip flags
    parser.add_argument("--skip-convert", action="store_true", help="Skip Stage 1 (PDF → images)")
    parser.add_argument("--skip-extraction", action="store_true", help="Skip Stage 2 (VLM extraction)")
    parser.add_argument("--skip-merge", action="store_true", help="Skip Stage 3 (merge pages)")
    parser.add_argument("--skip-generate", action="store_true", help="Skip Stage 4 (generate master)")
    parser.add_argument(
        "--only-step",
        type=int,
        choices=[1, 2, 3, 4],
        default=None,
        help="Run only a specific stage (1-4)",
    )

    args = parser.parse_args()

    # -------------------------------------------------------------------------
    # Determine mode and resolve paths
    # -------------------------------------------------------------------------
    if args.book_id:
        mode = "book"
        book_id = args.book_id
        book_dir = os.path.join(BOOKS_DIR, book_id)
        os.makedirs(book_dir, exist_ok=True)
        os.makedirs(os.path.join(book_dir, "lessons"), exist_ok=True)
        os.makedirs(os.path.join(book_dir, "images"), exist_ok=True)

        master = load_master(book_id)
        if not master:
            print(f"❌ master.json not found for book '{book_id}' at {book_dir}/master.json")
            print(f"   Create the book first via the dashboard API (POST /api/books/upload)")
            print(f"   or via lib/db/books.js createBook().")
            return 1

        pdf_path = resolve_source_pdf(book_id, master)
        # PDF is only strictly required for Stage 1 (PDF → images).
        # If we skip Stage 1 and have raw-json already, we can still proceed.
        needs_pdf = (args.only_step in (None, 1)) and not args.skip_convert
        if not pdf_path and needs_pdf:
            print(f"❌ Could not find source PDF for book '{book_id}'")
            print(f"   Looked in master.source_pdf, {book_dir}/source.pdf, {book_dir}/{book_id}.pdf, books/{book_id}.pdf")
            return 1
        elif not pdf_path:
            print(f"⚠️  Source PDF not found — continuing because Stage 1 is skipped")
            pdf_path = ""

        # Per-book staging paths (kept inside the book dir for isolation)
        temp_dir = os.path.join(book_dir, "temp")
        raw_json_dir = os.path.join(book_dir, "raw-json")
        merged_dir = os.path.join(book_dir, "merged-lessons")
        output_dir = book_dir
        log_path = os.path.join(book_dir, "extraction.log")

        # Use provided index, else default config index if exists, else None
        if args.index:
            index_path = args.index
        else:
            default_idx = os.path.join(SCRIPT_DIR, "config", "book-index.json")
            index_path = default_idx if os.path.exists(default_idx) else None

    elif args.pdf:
        mode = "legacy"
        book_id = None
        book_dir = None
        if not os.path.exists(args.pdf):
            print(f"❌ PDF file not found: {args.pdf}")
            return 1
        pdf_path = os.path.abspath(args.pdf)
        temp_dir = os.path.join(SCRIPT_DIR, "temp")
        raw_json_dir = os.path.join(SCRIPT_DIR, "raw-json")
        merged_dir = os.path.join(SCRIPT_DIR, "merged-lessons")
        output_dir = args.output or os.path.join(SCRIPT_DIR, "..", "src", "data")
        log_path = None
        index_path = args.index or os.path.join(SCRIPT_DIR, "config", "book-index.json")
        if not os.path.exists(index_path):
            index_path = None
    else:
        print("❌ Either --book-id or --pdf must be provided")
        parser.print_help()
        return 1

    logger = BookLogger(log_path)
    total_start = datetime.now()

    logger.log(f"""
╔══════════════════════════════════════════════════════════════╗
║        📚 Content Extractor — Full Pipeline Runner           ║
╠══════════════════════════════════════════════════════════════╣
║  Mode:    {mode:<49}║
║  Book:    {(book_id or os.path.basename(pdf_path)):<49}║
║  PDF:     {os.path.basename(pdf_path):<49}║
║  Model:   {args.model:<49}║
║  Output:  {output_dir[-49:]:<49}║
╚══════════════════════════════════════════════════════════════╝
""")

    # Update initial progress
    if mode == "book":
        update_extraction_progress(book_id, "extracting", 5, logger)

    # =========================================================================
    # Stage 1: PDF → Images
    # =========================================================================
    if args.only_step in (None, 1) and not args.skip_convert:
        if mode == "book":
            update_extraction_progress(book_id, "extracting", 10, logger)
        success = run_step(1, "PDF → Optimized PNG Images", [
            sys.executable,
            os.path.join(SCRIPTS_DIR, "pdf-to-images.py"),
            "--input", pdf_path,
            "--output", temp_dir,
        ], logger)
        if not success and args.only_step == 1:
            if mode == "book":
                update_extraction_progress(book_id, "failed", 10, logger)
            logger.close()
            return 1
        elif not success:
            logger.log("\n⚠️ Stage 1 had errors, but continuing to Stage 2...")

    # =========================================================================
    # Stage 2: VLM Extraction (long-running — can take hours)
    # =========================================================================
    if args.only_step in (None, 2) and not args.skip_extraction:
        if mode == "book":
            update_extraction_progress(book_id, "extracting", 20, logger)
        success = run_step(2, "Images → Per-page JSON (VLM Extraction)", [
            sys.executable,
            os.path.join(SCRIPTS_DIR, "extract-page.py"),
            "--input", temp_dir,
            "--output", raw_json_dir,
            "--model", args.model,
            "--cooldown", str(args.cooldown),
        ], logger)
        if not success and args.only_step == 2:
            if mode == "book":
                update_extraction_progress(book_id, "failed", 20, logger)
            logger.close()
            return 1
        elif not success:
            logger.log("\n⚠️ Stage 2 had errors, but continuing to Stage 3...")
        if mode == "book":
            update_extraction_progress(book_id, "extracting", 80, logger)

    # =========================================================================
    # Stage 3: Merge Pages into Lessons (only if we have a book-index)
    # =========================================================================
    merged_input_for_master = raw_json_dir
    use_merged = False

    if args.only_step in (None, 3) and not args.skip_merge and index_path:
        if mode == "book":
            update_extraction_progress(book_id, "extracting", 85, logger)
        success = run_step(3, "Per-page JSON → Merged Lesson JSON", [
            sys.executable,
            os.path.join(SCRIPTS_DIR, "merge-pages.py"),
            "--index", index_path,
            "--input", raw_json_dir,
            "--output", merged_dir,
        ], logger)
        if success:
            merged_input_for_master = merged_dir
            use_merged = True
        if not success and args.only_step == 3:
            if mode == "book":
                update_extraction_progress(book_id, "failed", 85, logger)
            logger.close()
            return 1
        elif not success:
            logger.log("\n⚠️ Stage 3 had errors — will pass raw-json to Stage 4 directly")
    elif args.only_step in (None, 3) and not args.skip_merge and not index_path:
        logger.log("\n⏭️  Stage 3 skipped — no book-index.json available")
        logger.log("    generate-master.py will handle lesson detection itself (Stage 4)")

    # =========================================================================
    # Stage 4: Generate master.json + lesson.json files
    # =========================================================================
    if args.only_step in (None, 4) and not args.skip_generate:
        if mode == "book":
            update_extraction_progress(book_id, "extracting", 90, logger)

        gen_cmd = [
            sys.executable,
            os.path.join(SCRIPTS_DIR, "generate-master.py"),
            "--book-id", (book_id or "legacy-book"),
            "--input", merged_input_for_master,
            "--input-format", ("merged" if use_merged else "raw"),
            "--output", output_dir,
            "--model", args.model,
            "--images-dir", temp_dir,
        ]
        if index_path:
            gen_cmd.extend(["--book-index", index_path])

        # In legacy mode, derive book metadata from the PDF filename if possible
        if mode == "legacy":
            gen_cmd.extend([
                "--book-title", os.path.splitext(os.path.basename(pdf_path))[0],
            ])

        success = run_step(4, "Merged/Raw JSON → master.json + lesson.json", gen_cmd, logger)
        if not success:
            if mode == "book":
                update_extraction_progress(book_id, "failed", 90, logger)
            logger.close()
            return 1

        if mode == "book":
            update_extraction_progress(book_id, "completed", 100, logger)

    # =========================================================================
    # Final Summary
    # =========================================================================
    elapsed = (datetime.now() - total_start).total_seconds()
    hours = int(elapsed // 3600)
    minutes = int((elapsed % 3600) // 60)
    seconds = int(elapsed % 60)

    logger.log(f"""
╔══════════════════════════════════════════════════════════════╗
║                   🎉 Pipeline Complete!                      ║
╠══════════════════════════════════════════════════════════════╣
║  Total Time:  {hours:>2}h {minutes:>2}m {seconds:>2}s{' ' * 35}║
║                                                              ║
║  Outputs:""")

    if mode == "book":
        logger.log(f"║    📁 Book dir:    {book_dir[:46]:<46}║")
        logger.log(f"║    📁 master.json: {os.path.join(book_dir, 'master.json')[:46]:<46}║")
        logger.log(f"║    📁 lessons/:    {os.path.join(book_dir, 'lessons')[:46]:<46}║")
        logger.log(f"║    📁 images/:     {os.path.join(book_dir, 'images')[:46]:<46}║")
        logger.log(f"║    📝 Log:         {log_path[:46]:<46}║")
    else:
        logger.log(f"║    📁 Images:      {temp_dir[:46]:<46}║")
        logger.log(f"║    📁 Raw JSON:    {raw_json_dir[:46]:<46}║")
        logger.log(f"║    📁 Merged:      {merged_dir[:46]:<46}║")
        logger.log(f"║    📁 Final:       {output_dir[:46]:<46}║")

    logger.log(f"╚══════════════════════════════════════════════════════════════╝")

    # Quick stats
    if os.path.exists(raw_json_dir):
        json_count = len([f for f in os.listdir(raw_json_dir) if f.startswith("page_") and f.endswith(".json")])
        logger.log(f"  📊 Total pages processed: {json_count}")
    if os.path.exists(merged_dir if use_merged else ""):
        lesson_count = len([f for f in os.listdir(merged_dir) if f.startswith("lesson-") and f.endswith(".json")])
        logger.log(f"  📊 Merged lessons: {lesson_count}")
    if mode == "book":
        lessons_dir = os.path.join(book_dir, "lessons")
        if os.path.exists(lessons_dir):
            lesson_count = len([f for f in os.listdir(lessons_dir) if f.startswith("lesson-") and f.endswith(".json")])
            logger.log(f"  📊 Generated lessons: {lesson_count}")

    logger.log(f"\n  💡 Next steps:")
    logger.log(f"     1. Open the dashboard and review extracted lessons")
    logger.log(f"     2. Edit lesson.json files via the editor UI")
    logger.log(f"     3. Generate videos from the Video Studio page")
    logger.log(f"     4. Distribute to the education platform")

    logger.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
