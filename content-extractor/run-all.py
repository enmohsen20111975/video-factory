#!/usr/bin/env python3
"""
One-Click Pipeline Runner
==========================
Runs all 4 steps of the content extraction pipeline in sequence:
1. PDF → Images
2. Images → Per-page JSON (via VLM)
3. Per-page JSON → Merged lesson JSON
4. Merged lesson JSON → Final Markdown + JSON

Usage:
    python run-all.py --pdf "books/physics-moaser.pdf"
    python run-all.py --pdf "books/physics-moaser.pdf" --model "gemma3:4b"
    python run-all.py --pdf "books/physics-moaser.pdf" --skip-extraction
    python run-all.py --pdf "books/physics-moaser.pdf" --only-step 3
"""

import argparse
import os
import subprocess
import sys
import time
import json

# Fix Windows console encoding issues for emoji printing
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except AttributeError:
        pass
from datetime import datetime
from pathlib import Path

def load_pipeline_config() -> dict:
    """Load the pipeline configuration from pipeline-config.json."""
    config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config", "pipeline-config.json")
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️  Warning: Failed to load pipeline-config.json: {e}")
    return {}

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SCRIPTS_DIR = os.path.join(SCRIPT_DIR, "scripts")


def run_step(step_num: int, description: str, command: list[str]) -> bool:
    """Run a pipeline step and return success/failure."""
    print(f"\n{'='*70}")
    print(f"  STEP {step_num}: {description}")
    print(f"{'='*70}\n")

    start_time = time.time()

    try:
        result = subprocess.run(
            command,
            cwd=SCRIPT_DIR,
            timeout=None,  # No timeout — these can take hours
            check=False
        )

        elapsed = time.time() - start_time
        if result.returncode == 0:
            print(f"\n  ✅ Step {step_num} completed in {elapsed:.1f}s")
            return True
        else:
            print(f"\n  ❌ Step {step_num} failed with return code {result.returncode}")
            return False

    except subprocess.TimeoutExpired:
        print(f"\n  ❌ Step {step_num} timed out")
        return False
    except KeyboardInterrupt:
        print(f"\n  ⚠️ Step {step_num} interrupted by user")
        print(f"  💡 You can resume by running this script again.")
        sys.exit(1)
    except Exception as e:
        print(f"\n  ❌ Step {step_num} error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Run the complete content extraction pipeline"
    )
    config = load_pipeline_config()
    vlm_config = config.get("stage_2_vlm_extraction", {})
    default_model = vlm_config.get("preferred_model", "qwen2-vl:7b")
    default_cooldown = vlm_config.get("cooldown_seconds", 10)

    parser.add_argument(
        "--pdf", "-p",
        required=True,
        help="Path to the input PDF file"
    )
    parser.add_argument(
        "--model", "-m",
        default=default_model,
        help=f"Ollama model for VLM extraction (default: {default_model})"
    )
    parser.add_argument(
        "--index",
        default="config/book-index.json",
        help="Path to book-index.json (default: config/book-index.json)"
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Final output directory (default: ../src/data/)"
    )
    parser.add_argument(
        "--cooldown",
        type=int,
        default=default_cooldown,
        help=f"Cooldown between VLM pages in seconds (default: {default_cooldown})"
    )

    # Skip flags
    parser.add_argument(
        "--skip-convert",
        action="store_true",
        help="Skip Step 1 (PDF to images) — images already exist"
    )
    parser.add_argument(
        "--skip-extraction",
        action="store_true",
        help="Skip Step 2 (VLM extraction) — raw JSON already exists"
    )
    parser.add_argument(
        "--skip-merge",
        action="store_true",
        help="Skip Step 3 (merge pages) — merged lessons already exist"
    )
    parser.add_argument(
        "--skip-generate",
        action="store_true",
        help="Skip Step 4 (generate output) — final files already exist"
    )
    parser.add_argument(
        "--only-step",
        type=int,
        choices=[1, 2, 3, 4],
        default=None,
        help="Run only a specific step (1-4)"
    )

    args = parser.parse_args()

    # Validate PDF exists
    if not os.path.exists(args.pdf):
        print(f"❌ PDF file not found: {args.pdf}")
        sys.exit(1)

    # Setup paths
    pdf_path = os.path.abspath(args.pdf)
    temp_dir = os.path.join(SCRIPT_DIR, "temp")
    raw_json_dir = os.path.join(SCRIPT_DIR, "raw-json")
    merged_dir = os.path.join(SCRIPT_DIR, "merged-lessons")
    output_dir = args.output or os.path.join(SCRIPT_DIR, "..", "src", "data")

    total_start = datetime.now()

    print(f"""
╔══════════════════════════════════════════════════════════════╗
║        📚 Content Extractor — Full Pipeline Runner          ║
╠══════════════════════════════════════════════════════════════╣
║  PDF:     {os.path.basename(pdf_path):<48} ║
║  Model:   {args.model:<48} ║
║  Index:   {os.path.basename(args.index):<48} ║
║  Output:  {os.path.basename(output_dir):<48} ║
╚══════════════════════════════════════════════════════════════╝
""")

    # =========================================================================
    # Step 1: PDF to Images
    # =========================================================================
    if args.only_step in (None, 1) and not args.skip_convert:
        success = run_step(1, "PDF → Optimized PNG Images", [
            sys.executable,
            os.path.join(SCRIPTS_DIR, "pdf-to-images.py"),
            "--input", pdf_path,
            "--output", temp_dir,
        ])
        if not success and args.only_step == 1:
            sys.exit(1)
        elif not success:
            print("\n⚠️ Step 1 had errors, but continuing to Step 2...")

    # =========================================================================
    # Step 2: VLM Extraction (main processing — takes hours)
    # =========================================================================
    if args.only_step in (None, 2) and not args.skip_extraction:
        success = run_step(2, "Images → Per-page JSON (VLM Extraction)", [
            sys.executable,
            os.path.join(SCRIPTS_DIR, "extract-page.py"),
            "--input", temp_dir,
            "--output", raw_json_dir,
            "--model", args.model,
            "--cooldown", str(args.cooldown),
        ])
        if not success and args.only_step == 2:
            sys.exit(1)
        elif not success:
            print("\n⚠️ Step 2 had errors, but continuing to Step 3...")

    # =========================================================================
    # Step 3: Merge Pages into Lessons
    # =========================================================================
    if args.only_step in (None, 3) and not args.skip_merge:
        success = run_step(3, "Per-page JSON → Merged Lesson JSON", [
            sys.executable,
            os.path.join(SCRIPTS_DIR, "merge-pages.py"),
            "--index", os.path.join(SCRIPT_DIR, args.index),
            "--input", raw_json_dir,
            "--output", merged_dir,
        ])
        if not success and args.only_step == 3:
            sys.exit(1)
        elif not success:
            print("\n⚠️ Step 3 had errors, but continuing to Step 4...")

    # =========================================================================
    # Step 4: Generate Final Output
    # =========================================================================
    if args.only_step in (None, 4) and not args.skip_generate:
        success = run_step(4, "Merged Lesson JSON → Final Markdown + JSON", [
            sys.executable,
            os.path.join(SCRIPTS_DIR, "generate-markdown.py"),
            "--input", merged_dir,
            "--output", output_dir,
            "--format", "both",
        ])
        if not success:
            sys.exit(1)

    # =========================================================================
    # Final Summary
    # =========================================================================
    elapsed = (datetime.now() - total_start).total_seconds()
    hours = int(elapsed // 3600)
    minutes = int((elapsed % 3600) // 60)
    seconds = int(elapsed % 60)

    print(f"""
╔══════════════════════════════════════════════════════════════╗
║                   🎉 Pipeline Complete!                     ║
╠══════════════════════════════════════════════════════════════╣
║  Total Time:  {hours:>2}h {minutes:>2}m {seconds:>2}s{' ' * 34}║
║                                                              ║
║  Outputs:                                                    ║
║    📁 Images:      {temp_dir:<43}║
║    📁 Raw JSON:    {raw_json_dir:<43}║
║    📁 Merged:      {merged_dir:<43}║
║    📁 Final:       {output_dir:<43}║
╚══════════════════════════════════════════════════════════════╝
""")

    # Quick stats
    if os.path.exists(raw_json_dir):
        json_count = len([f for f in os.listdir(raw_json_dir) if f.startswith("page_") and f.endswith(".json")])
        print(f"  📊 Total pages processed: {json_count}")

    if os.path.exists(merged_dir):
        lesson_count = len([f for f in os.listdir(merged_dir) if f.startswith("lesson-") and f.endswith(".json")])
        print(f"  📊 Lessons generated: {lesson_count}")

    print(f"\n  💡 Next steps:")
    print(f"     1. Review the generated content for accuracy")
    print(f"     2. Generate voiceovers: python ../scripts/generate_tts.py --lesson <lesson-id>")
    print(f"     3. Render videos: npx remotion render LessonVideo --lesson-name=<lesson-id>")

    return 0


if __name__ == "__main__":
    sys.exit(main())