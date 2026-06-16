#!/usr/bin/env python3
"""
Markdown Generator: Lesson JSON → Final Output
================================================
Converts merged lesson JSON files into structured Markdown output
matching the existing video-factory 6-chunk template format.

Also generates the final JSON format compatible with Remotion compositions.

Output formats:
1. Markdown files with YAML frontmatter (6 chunks)
2. JSON files matching existing ohm-law.json structure

Usage:
    python generate-markdown.py --input "merged-lessons/" --output "../src/data/lessons/"
    python generate-markdown.py --input "merged-lessons/" --output "../src/data/lessons/" --format both
    python generate-markdown.py --input "merged-lessons/" --output "../src/data/lessons/" --format json
"""

import argparse
import json
import os
import re
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
_gen_config = _config.get("stage_4_generator", {})
VOICEOVER_DIALECT = _gen_config.get("voiceover_dialect", "egyptian_colloquial")
MCQ_QUESTIONS_COUNT = _gen_config.get("mcq_questions_count", 5)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FACTORY_DATA_DIR = os.path.join(SCRIPT_DIR, "..", "..", "src", "data")


# =============================================================================
# Content Generators
# =============================================================================

def generate_video_script(lesson: dict) -> str:
    """
    Generate Chunk 1: Video Script from lesson data.
    Converts formal Arabic to Egyptian colloquial for voiceover.
    """
    title = lesson.get("title", "درس جديد")
    summary = lesson.get("content_summary", "")
    formulas = lesson.get("formulas", [])
    examples = lesson.get("examples", [])
    definitions = lesson.get("definitions", [])
    key_points = lesson.get("key_points", [])

    lines = []
    lines.append(f"# 🎬 Chunk 1: Video Script (سكريبت الفيديو)")
    lines.append("")
    lines.append("## عنوان الفيديو")
    lines.append(f'"{title}"')
    lines.append("")
    lines.append("## السكريبت (بالعامية المصرية)")
    lines.append("")

    # Opening
    if VOICEOVER_DIALECT == "egyptian_colloquial":
        lines.append("أهلاً بيكم في درس جديد من Smart Education.")
        lines.append(f"النهاردة هنتكلم عن {title}.")
    else:
        lines.append("أهلاً بكم في درس جديد من Smart Education.")
        lines.append(f"اليوم سنتحدث عن {title}.")
    lines.append("")

    # Content summary
    if summary:
        lines.append(summary)
        lines.append("")

    # Key concepts
    if definitions:
        lines.append("### المفاهيم الأساسية")
        for defn in definitions[:5]:
            term = defn.get("term", "")
            definition = defn.get("definition", "")
            if term and definition:
                lines.append(f"- **{term}**: {definition}")
        lines.append("")

    # Formulas
    if formulas:
        lines.append("### الصيغ الرياضية")
        for f in formulas:
            latex = f.get("formula_latex", "")
            desc = f.get("description", "")
            if latex:
                lines.append(f"- **{latex}**: {desc}")
        lines.append("")

    # Examples (conversational style)
    if examples:
        lines.append("### أمثلة تطبيقية")
        for ex in examples[:2]:
            question = ex.get("question", "")
            answer = ex.get("final_answer", "")
            if question:
                lines.append(f"لو عندنا{question}...")
                if answer:
                    lines.append(f"الحل: {answer}")
            lines.append("")

    # Key takeaway
    if key_points:
        lines.append("###_POINTS")
        for point in key_points[:3]:
            lines.append(f"- {point}")
        lines.append("")

    # Closing
    if VOICEOVER_DIALECT == "egyptian_colloquial":
        lines.append("لو درست معايا، اختبر فهمك في الأسئلة اللي جاية.")
    else:
        lines.append("إذا درست معي، فاختبر فهمك في الأسئلة القادمة.")
    lines.append("")

    return "\n".join(lines)


def generate_mind_map(lesson: dict) -> str:
    """
    Generate Chunk 2: Mind Map data from definitions, formulas, and key points.
    """
    title = lesson.get("title", "")
    definitions = lesson.get("definitions", [])
    formulas = lesson.get("formulas", [])
    key_points = lesson.get("key_points", [])

    lines = []
    lines.append("# 🧠 Chunk 2: Mind Map (الخريطة الذهنية)")
    lines.append("")
    lines.append("```json")
    lines.append(json.dumps({
        "central": title,
        "branches": [
            {
                "label": "المفاهيم",
                "items": [d.get("term", "") for d in definitions[:5]]
            },
            {
                "label": "الصيغ",
                "items": [f.get("description", f.get("formula_latex", "")) for f in formulas[:5]]
            },
            {
                "label": "نقاط رئيسية",
                "items": key_points[:5]
            }
        ]
    }, ensure_ascii=False, indent=2))
    lines.append("```")
    lines.append("")

    return "\n".join(lines)


def generate_text_content(lesson: dict) -> str:
    """
    Generate Chunk 3: Text Content + Infographics data.
    """
    raw_text = lesson.get("raw_text", "")
    tables = lesson.get("tables", [])
    figures = lesson.get("figures", [])

    lines = []
    lines.append("# 📖 Chunk 3: Text Content + Infographics")
    lines.append("")

    if raw_text:
        lines.append("## المحتوى النصي")
        lines.append("")
        lines.append(raw_text[:2000])  # Limit length
        lines.append("")

    if tables:
        lines.append("## الجداول")
        for table in tables:
            desc = table.get("description", "")
            headers = table.get("headers", [])
            if desc:
                lines.append(f"### {desc}")
            if headers:
                lines.append("| " + " | ".join(headers) + " |")
                lines.append("| " + " | ".join(["---"] * len(headers)) + " |")
            lines.append("")

    if figures:
        lines.append("## الرسوم التوضيحية")
        for fig in figures:
            desc = fig.get("description", "")
            fig_type = fig.get("type", "")
            if desc:
                lines.append(f"- [{fig_type}] {desc}")
        lines.append("")

    return "\n".join(lines)


def generate_simulator_description(lesson: dict) -> str:
    """
    Generate Chunk 4: Simulator Description from figures, formulas, examples.
    """
    formulas = lesson.get("formulas", [])
    examples = lesson.get("examples", [])
    figures = lesson.get("figures", [])

    lines = []
    lines.append("# 🧪 Chunk 4: Simulator Description")
    lines.append("")
    lines.append("## وصف المحاكاة")
    lines.append("")

    # Build simulation parameters from formulas and examples
    sim_params = {}
    for f in formulas:
        variables = f.get("variables", [])
        for v in variables:
            symbol = v.get("symbol", "")
            meaning = v.get("meaning", "")
            unit = v.get("unit", "")
            if symbol:
                sim_params[symbol] = {"meaning": meaning, "unit": unit}

    if sim_params:
        lines.append("### معاملات المحاكاة")
        lines.append("```json")
        lines.append(json.dumps(sim_params, ensure_ascii=False, indent=2))
        lines.append("```")
        lines.append("")

    # Describe what the simulator should show
    if figures:
        lines.append("### وصف التفاعل")
        for fig in figures[:2]:
            lines.append(f"- المحاكاة تعرض: {fig.get('description', '示ة تفاعلية')}")
        lines.append("")

    # Example problems for interactive solving
    if examples:
        lines.append("### أمثلة تفاعلية")
        for ex in examples[:2]:
            question = ex.get("question", "")
            steps = ex.get("solution_steps", [])
            if question:
                lines.append(f"- **المسألة**: {question}")
                if steps:
                    for step in steps[:3]:
                        lines.append(f"  - {step}")
        lines.append("")

    return "\n".join(lines)


def generate_question_bank(lesson: dict) -> str:
    """
    Generate Chunk 5: Question Bank from exercises and examples.
    Generates questions: MCQ, numerical, conceptual.
    """
    exercises = lesson.get("exercises", [])
    examples = lesson.get("examples", [])
    formulas = lesson.get("formulas", [])

    lines = []
    lines.append("# ⚡ Chunk 5: Question Bank (بنك الأسئلة)")
    lines.append("")

    question_num = 0

    # Use existing exercises first
    for ex in exercises[:max(1, MCQ_QUESTIONS_COUNT - 2)]:
        if question_num >= MCQ_QUESTIONS_COUNT:
            break
        question_num += 1
        q_text = ex.get("question", "")
        answer = ex.get("answer", "")
        q_type = ex.get("type", "mcq")
        lines.append(f"## السؤال {question_num}")
        lines.append(f"**{q_text}**")
        lines.append(f"- النوع: {q_type}")
        if answer:
            lines.append(f"- الجواب: {answer}")
        lines.append("")

    # Generate questions from examples if not enough exercises
    for ex in examples:
        if question_num >= MCQ_QUESTIONS_COUNT:
            break
        question_num += 1
        q_text = ex.get("question", "")
        answer = ex.get("final_answer", "")
        if q_text:
            lines.append(f"## السؤال {question_num}")
            lines.append(f"**{q_text}**")
            if answer:
                lines.append(f"- الجواب: {answer}")
            lines.append("")

    # Pad with generated questions if still less than MCQ_QUESTIONS_COUNT
    if question_num < MCQ_QUESTIONS_COUNT and formulas:
        for f in formulas:
            if question_num >= MCQ_QUESTIONS_COUNT:
                break
            question_num += 1
            desc = f.get("description", "")
            latex = f.get("formula_latex", "")
            lines.append(f"## السؤال {question_num}")
            lines.append(f"**اكتب الصيغة الرياضية لـ {desc}**")
            lines.append(f"- الجواب: ${latex}$")
            lines.append("")

    lines.append(f"**ملاحظة**: ⚠️ هذا المحتوى تم استخراجه تلقائياً. يُرجى مراجعة الأسئلة والإجابات.")
    lines.append("")

    return "\n".join(lines)


def generate_cheat_sheet(lesson: dict) -> str:
    """
    Generate Chunk 6: Cheat Sheet + Flashcards from formulas, key points, definitions.
    """
    title = lesson.get("title", "")
    formulas = lesson.get("formulas", [])
    definitions = lesson.get("definitions", [])
    key_points = lesson.get("key_points", [])

    lines = []
    lines.append("# 🏆 Chunk 6: Cheat Sheet + Flashcards")
    lines.append("")
    lines.append(f"## ملخص {title}")
    lines.append("")

    # Flashcard-style formulas
    if formulas:
        lines.append("### 📐 Flashcards: الصيغ المهمة")
        for f in formulas:
            latex = f.get("formula_latex", "")
            desc = f.get("description", "")
            variables = f.get("variables", [])
            if latex:
                lines.append(f"**{desc}**")
                lines.append(f"- الصيغة: ${latex}$")
                for v in variables:
                    sym = v.get("symbol", "")
                    meaning = v.get("meaning", "")
                    unit = v.get("unit", "")
                    if sym:
                        lines.append(f"  - {sym} = {meaning} ({unit})")
                lines.append("")

    # Flashcard-style definitions
    if definitions:
        lines.append("### 📚 Flashcards: المفاهيم")
        for d in definitions:
            term = d.get("term", "")
            defn = d.get("definition", "")
            if term and defn:
                lines.append(f"**{term}**")
                lines.append(f"- {defn}")
                lines.append("")

    # Key points summary
    if key_points:
        lines.append("### ⭐ النقاط الرئيسية")
        for point in key_points:
            lines.append(f"- ✅ {point}")
        lines.append("")

    lines.append("**ملاحظة**: ⚠️ هذا المحتوى تم استخراجه تلقائياً من كتب المعاصر/الامتحان. يُرجى التحقق من الدقة特别是 للصيغ الرياضية.")
    lines.append("")

    return "\n".join(lines)


# =============================================================================
# YAML Frontmatter Generator
# =============================================================================

def generate_yaml_frontmatter(lesson: dict) -> str:
    """Generate YAML frontmatter for the lesson."""
    lesson_id = lesson.get("lesson_id", "unknown")
    subject = lesson.get("subject", "physics")
    grade = lesson.get("grade", "3")
    term = lesson.get("term", "1")
    chapter_id = lesson.get("chapter_id", "unknown")
    chapter_name = lesson.get("chapter_name", "")
    title = lesson.get("title", "")
    formulas = lesson.get("formulas", [])
    exercises = lesson.get("exercises", [])

    # Generate a proper lesson_id
    if not lesson_id.startswith("phy"):
        lesson_id = f"phy-{grade}-{term}-1-{lesson_id.replace('lesson-', '')}"

    lines = []
    lines.append("---")
    lines.append(f'lesson_id: "{lesson_id}"')
    lines.append(f'subject: "{subject}"')
    lines.append(f'grade: "{grade}"')
    lines.append(f'term: "{term}"')
    lines.append(f'chapter_id: "{chapter_id}"')
    lines.append(f'chapter_name: "{chapter_name}"')
    lines.append(f'lesson_title: "{title}"')

    if formulas:
        lines.append("formulas:")
        for f in formulas:
            latex = f.get("formula_latex", "")
            if latex:
                lines.append(f'  - "{latex}"')

    if exercises:
        lines.append(f'quiz_question_count: {min(len(exercises), MCQ_QUESTIONS_COUNT)}')

    lines.append(f'extracted_from: "auto-extraction"')
    lines.append(f'extraction_timestamp: "{datetime.now().isoformat()}"')
    avg_conf = lesson.get("statistics", {}).get("average_confidence", 0)
    lines.append(f'confidence: {avg_conf}')
    needs_review = lesson.get("needs_review", False)
    lines.append(f'needs_review: {"true" if needs_review else "false"}')
    lines.append("---")
    lines.append("")

    return "\n".join(lines)


# =============================================================================
# Full Markdown Generator
# =============================================================================

def generate_full_markdown(lesson: dict) -> str:
    """Generate complete 6-chunk Markdown file."""
    sections = [
        generate_yaml_frontmatter(lesson),
        generate_video_script(lesson),
        generate_mind_map(lesson),
        generate_text_content(lesson),
        generate_simulator_description(lesson),
        generate_question_bank(lesson),
        generate_cheat_sheet(lesson),
    ]
    return "\n\n---\n\n".join(sections)


# =============================================================================
# JSON Generator (for Remotion)
# =============================================================================

def generate_remotion_json(lesson: dict) -> dict:
    """
    Generate JSON compatible with existing Remotion video system.
    Matches the ohm-law.json structure.
    """
    title = lesson.get("title", "")
    chapter_name = lesson.get("chapter_name", "")
    formulas = lesson.get("formulas", [])
    summary = lesson.get("content_summary", "")

    # Build voiceover text from content
    voiceover_parts = []
    voiceover_parts.append(f"أهلاً بيكم في درس جديد من Smart Education. النهاردة هنتكلم عن {title}.")

    if summary:
        voiceover_parts.append(summary)

    # Add formula explanations
    for f in formulas:
        desc = f.get("description", "")
        if desc:
            voiceover_parts.append(f"الصيغة اللي هنستخدمها: {desc}.")

    # Add examples
    for ex in lesson.get("examples", [])[:1]:
        question = ex.get("question", "")
        answer = ex.get("final_answer", "")
        if question and answer:
            voiceover_parts.append(f"لو عندنا {question}. الحل: {answer}")

    voiceover_text = " ".join(voiceover_parts)

    # Build formula text
    formula_text = " و ".join([
        f.get("formula_latex", "")
        for f in formulas
        if f.get("formula_latex")
    ]) or "N/A"

    # Build simulation defaults from formulas
    simulation = {}
    for f in formulas:
        for v in f.get("variables", []):
            symbol = v.get("symbol", "")
            if symbol:
                simulation[symbol.lower()] = 0

    return {
        "title": title,
        "topic": f"{chapter_name}" if chapter_name else "",
        "voiceoverText": voiceover_text,
        "formulaText": formula_text,
        "simulation": simulation
    }


# =============================================================================
# Main Pipeline
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Generate final Markdown and JSON files from merged lesson data"
    )
    parser.add_argument(
        "--input", "-i",
        default="merged-lessons/",
        help="Directory containing merged lesson JSON files (default: merged-lessons/)"
    )
    parser.add_argument(
        "--output", "-o",
        default=None,
        help="Output directory for generated files (default: ../src/data/)"
    )
    parser.add_argument(
        "--format", "-f",
        choices=["markdown", "json", "both"],
        default="both",
        help="Output format: markdown, json, or both (default: both)"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-generate all files even if they exist"
    )

    args = parser.parse_args()

    # Validate input
    if not os.path.exists(args.input):
        print(f"❌ Input directory not found: {args.input}")
        sys.exit(1)

    # Determine output directory
    if args.output:
        output_dir = args.output
    else:
        output_dir = FACTORY_DATA_DIR

    # Create output subdirectories
    markdown_dir = os.path.join(output_dir, "lessons")
    json_dir = output_dir

    if args.format in ("markdown", "both"):
        os.makedirs(markdown_dir, exist_ok=True)
    if args.format in ("json", "both"):
        os.makedirs(json_dir, exist_ok=True)

    # Find all lesson JSON files
    lesson_files = sorted([
        f for f in os.listdir(args.input)
        if f.startswith("lesson-") and f.endswith(".json")
    ])

    if not lesson_files:
        print(f"❌ No lesson files found in {args.input}")
        sys.exit(1)

    print(f"📚 Found {len(lesson_files)} lesson files")
    print(f"📝 Output format: {args.format}")
    print(f"📁 Output directory: {output_dir}")

    # Process each lesson
    start_time = datetime.now()
    success_count = 0
    error_count = 0
    review_count = 0

    for lesson_file in lesson_files:
        lesson_path = os.path.join(args.input, lesson_file)

        try:
            with open(lesson_path, "r", encoding="utf-8") as f:
                lesson = json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"  ❌ Failed to load {lesson_file}: {e}")
            error_count += 1
            continue

        lesson_id = lesson.get("lesson_id", lesson_file.replace(".json", ""))
        title = lesson.get("title", "Unknown")

        print(f"\n  📝 Processing {lesson_id}: {title}")

        # Check needs review
        if lesson.get("needs_review"):
            review_count += 1
            print(f"     ⚠️  Needs review (low confidence)")

        # Generate Markdown
        if args.format in ("markdown", "both"):
            md_content = generate_full_markdown(lesson)
            md_path = os.path.join(markdown_dir, f"{lesson_id}.md")

            if not args.force and os.path.exists(md_path):
                print(f"     ⏭️  Markdown already exists (use --force)")
            else:
                with open(md_path, "w", encoding="utf-8") as f:
                    f.write(md_content)
                print(f"     ✅ Markdown → {os.path.basename(md_path)}")

        # Generate JSON
        if args.format in ("json", "both"):
            json_data = generate_remotion_json(lesson)
            json_path = os.path.join(json_dir, f"{lesson_id}.json")

            if not args.force and os.path.exists(json_path):
                print(f"     ⏭️  JSON already exists (use --force)")
            else:
                with open(json_path, "w", encoding="utf-8") as f:
                    json.dump(json_data, f, ensure_ascii=False, indent=2)
                print(f"     ✅ JSON → {os.path.basename(json_path)}")

        success_count += 1

    # Summary
    elapsed = (datetime.now() - start_time).total_seconds()
    print(f"\n{'='*60}")
    print(f"🎉 Generation complete!")
    print(f"   ✅ Generated: {success_count}/{len(lesson_files)}")
    print(f"   ⚠️  Review needed: {review_count}")
    print(f"   ❌ Errors: {error_count}")
    print(f"   ⏱️  Time: {elapsed:.1f}s")
    print(f"   📁 Markdown output: {markdown_dir}")
    print(f"   📁 JSON output: {json_dir}")

    return 0 if error_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())