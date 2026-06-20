#!/usr/bin/env python3
"""
generate-script.py

Turns a `lesson.json` file into a spoken voiceover script.

Usage:
    python scripts/generate-script.py --book-id <book> --lesson-id <lesson>
    python scripts/generate-script.py --book-id <book> --lesson-id <lesson> --dialect standard_arabic

The script:
    1. Reads `data/books/<book-id>/lessons/<lesson-id>.json`.
    2. Walks the lesson content (title, summary, definitions, formulas,
       explanations, quiz) and builds a flowing Arabic narration.
    3. Writes the script back to `lesson.video.script_text`.
    4. Prints the script text to stdout so it can be piped into
       `generate_tts.py` via the calling Node orchestrator.

Two dialects are supported:
    * `egyptian_colloquial` - friendly Egyptian colloquial Arabic (default).
    * `standard_arabic`     - modern standard Arabic (Fusha).

The default dialect is read from `data/config/pipeline-config.json`
(`stage_4_generator.voiceover_dialect`) but can be overridden with
`--dialect`.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any, Dict, List, Optional

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(ROOT, "data")
BOOKS_DIR = os.path.join(DATA_DIR, "books")
CONFIG_FILE = os.path.join(DATA_DIR, "config", "pipeline-config.json")


# --------------------------------------------------------------------------- #
# Config helpers
# --------------------------------------------------------------------------- #
def load_config() -> Dict[str, Any]:
    if not os.path.exists(CONFIG_FILE):
        return {}
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:  # pragma: no cover - best-effort config load
        print(f"warning: failed to read pipeline config: {exc}", file=sys.stderr)
        return {}


def default_dialect() -> str:
    cfg = load_config()
    return (
        cfg.get("stage_4_generator", {}).get("voiceover_dialect")
        or "egyptian_colloquial"
    )


# --------------------------------------------------------------------------- #
# Script generation
# --------------------------------------------------------------------------- #
class ScriptBuilder:
    def __init__(self, dialect: str = "egyptian_colloquial") -> None:
        self.dialect = dialect
        self.lines: List[str] = []

    def add(self, text: str) -> None:
        text = (text or "").strip()
        if not text:
            return
        self.lines.append(text)

    def add_blank(self) -> None:
        if self.lines and self.lines[-1] != "":
            self.lines.append("")

    def greeting(self, title: str, subject: str = "") -> None:
        if self.dialect == "standard_arabic":
            self.add(f"أهلاً بكم في درس جديد. درس اليوم هو {title}.")
            if subject:
                self.add(f"ضمن مادة {subject}.")
        else:
            self.add(f"أهلاً بيكم في درس جديد. النهاردة هنتكلم عن {title}.")
            if subject:
                self.add(f"ده جزء من مادة {subject}.")

    def summary(self, text: str) -> None:
        text = (text or "").strip()
        if not text:
            return
        if self.dialect == "standard_arabic":
            self.add(f"في هذا الدرس سنتعلم: {text}")
        else:
            self.add(f"في الدرس ده هنتعلم: {text}")

    def definitions(self, definitions: List[Dict[str, Any]]) -> None:
        if not definitions:
            return
        self.add_blank()
        if self.dialect == "standard_arabic":
            self.add("نتعرف أولاً على المفاهيم الأساسية.")
        else:
            self.add("الأول خلينا نتعرف على المصطلحات الأساسية.")
        for d in definitions:
            term = (d.get("term") or "").strip()
            definition = (d.get("definition") or "").strip()
            if not term or not definition:
                continue
            if self.dialect == "standard_arabic":
                self.add(f"{term}: {definition}")
            else:
                self.add(f"{term} هو: {definition}")

    def formulas(
        self,
        formulas: List[Dict[str, Any]],
        dialect: str = "egyptian_colloquial",
    ) -> None:
        if not formulas:
            return
        self.add_blank()
        if dialect == "standard_arabic":
            self.add("والآن إلى الصيغ الرياضية المستخدمة في هذا الدرس.")
        else:
            self.add("دلوقتي هنتكلم عن الصيغ الرياضية اللي هنستخدمها.")
        for f in formulas:
            latex = (f.get("latex") or "").strip()
            description = (f.get("description") or "").strip()
            if not latex and not description:
                continue
            # Translate a few common LaTeX tokens to spoken Arabic words so
            # the TTS doesn't read "V = I \times R" verbatim.
            spoken = latex
            if spoken:
                spoken = (
                    spoken.replace("\\times", "ضرب")
                    .replace("\\div", "تقسيم")
                    .replace("\\cdot", "ضرب")
                    .replace("\\frac", "قسمة")
                    .replace("\\sqrt", "جذر تربيعي")
                    .replace("\\leq", "أقل من أو يساوي")
                    .replace("\\geq", "أكبر من أو يساوي")
                    .replace("\\neq", "لا يساوي")
                    .replace("\\approx", "تقريباً يساوي")
                )
            if dialect == "standard_arabic":
                if description:
                    self.add(f"{description}.")
                if spoken:
                    self.add(f"والصيغة الرياضية هي: {spoken}.")
            else:
                if description:
                    self.add(f"{description}.")
                if spoken:
                    self.add(f"الصيغة بيقول كده: {spoken}.")

            variables = f.get("variables") or []
            for v in variables:
                symbol = (v.get("symbol") or "").strip()
                meaning = (v.get("meaning") or "").strip()
                unit = (v.get("unit") or "").strip()
                if not symbol or not meaning:
                    continue
                unit_str = f" ووحدتها {unit}" if unit else ""
                if dialect == "standard_arabic":
                    self.add(f"{symbol} ترمز إلى {meaning}{unit_str}.")
                else:
                    self.add(f"{symbol} ده بينوب عن {meaning}{unit_str}.")

    def explanations(self, explanations: List[Dict[str, Any]]) -> None:
        if not explanations:
            return
        self.add_blank()
        if self.dialect == "standard_arabic":
            self.add("والآن نشرح التفاصيل.")
        else:
            self.add("دلوقتي هنشرح التفاصيل بالظبط.")
        sorted_exps = sorted(explanations, key=lambda e: e.get("order", 0) or 0)
        for e in sorted_exps:
            title = (e.get("title") or "").strip()
            text = (e.get("text") or "").strip()
            if not text:
                continue
            if title:
                if self.dialect == "standard_arabic":
                    self.add(f"{title}: {text}")
                else:
                    self.add(f"{title}: {text}")
            else:
                self.add(text)

    def tables(self, tables: List[Dict[str, Any]]) -> None:
        if not tables:
            return
        self.add_blank()
        if self.dialect == "standard_arabic":
            self.add("نستعرض الآن جدولاً يلخص المعلومات.")
        else:
            self.add("خلينا نستعرض جدول بيختصر لينا المعلومات.")
        for t in tables:
            title = (t.get("title") or "").strip()
            headers = t.get("headers") or []
            rows = t.get("rows") or []
            if title:
                self.add(f"عنوان الجدول: {title}.")
            for row in rows:
                # Pair headers with row cells so each row reads naturally.
                parts: List[str] = []
                for i, cell in enumerate(row):
                    if i < len(headers):
                        parts.append(f"{headers[i]} {cell}")
                    else:
                        parts.append(str(cell))
                self.add("، ".join(parts) + ".")
            self.add_blank()

    def questions(self, questions: List[Dict[str, Any]]) -> None:
        if not questions:
            return
        self.add_blank()
        if self.dialect == "standard_arabic":
            self.add("والآن دعونا نختبر فهمنا.")
        else:
            self.add("دلوقتي وقت الاختبار، عشان نختبر فهمنا.")
        for i, q in enumerate(questions, start=1):
            question_text = (q.get("question") or "").strip()
            if not question_text:
                continue
            if self.dialect == "standard_arabic":
                self.add(f"السؤال {i}: {question_text}")
            else:
                self.add(f"السؤال {i}: {question_text}")
            options = q.get("options") or []
            for j, opt in enumerate(options, start=1):
                self.add(f"الخيار {j}: {opt}.")
            correct_index = q.get("correct_index")
            explanation = (q.get("explanation") or "").strip()
            if isinstance(correct_index, int) and 0 <= correct_index < len(options):
                if self.dialect == "standard_arabic":
                    self.add(f"الإجابة الصحيحة هي: {options[correct_index]}.")
                else:
                    self.add(f"الإجابة الصح هي: {options[correct_index]}.")
            if explanation:
                self.add(f"الشرح: {explanation}")

    def outro(self, title: str) -> None:
        self.add_blank()
        if self.dialect == "standard_arabic":
            self.add("وإلى هنا نصل إلى نهاية الدرس. شكراً لكم على المتابعة.")
            self.add(f"نتمنى أن تكونوا قد استفدتم من درس {title}.")
        else:
            self.add("وكده خلص الدرس. شكراً لكم على المتابعة.")
            self.add(f"أتمنى إنكم تكونوا استفدتم من درس {title}.")

    def build(self) -> str:
        # Collapse repeated blank lines but preserve paragraph spacing.
        out: List[str] = []
        blank = False
        for line in self.lines:
            if not line.strip():
                if not blank:
                    out.append("")
                    blank = True
            else:
                out.append(line)
                blank = False
        return "\n".join(out).strip()


def generate_script(lesson: Dict[str, Any], dialect: str) -> str:
    meta = lesson.get("metadata") or {}
    content = lesson.get("content") or {}

    title = (meta.get("title") or "الدرس").strip()
    subject = (meta.get("subject") or "").strip()
    summary = (content.get("summary") or "").strip()

    builder = ScriptBuilder(dialect=dialect)
    builder.greeting(title, subject)
    builder.summary(summary)
    builder.definitions(content.get("definitions") or [])
    builder.formulas(content.get("formulas") or [], dialect=dialect)
    builder.explanations(content.get("explanations") or [])
    builder.tables(lesson.get("tables") or [])
    builder.questions(lesson.get("questions") or [])
    builder.outro(title)
    return builder.build()


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Generate an Arabic voiceover script from lesson.json.",
    )
    p.add_argument("--book-id", required=True, help="Book identifier")
    p.add_argument("--lesson-id", required=True, help="Lesson identifier")
    p.add_argument(
        "--dialect",
        choices=["egyptian_colloquial", "standard_arabic"],
        default=None,
        help="Voiceover dialect (defaults to pipeline-config value).",
    )
    p.add_argument(
        "--no-write",
        action="store_true",
        help="Do not write the script back to lesson.json (just print).",
    )
    return p.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    dialect = args.dialect or default_dialect()

    lesson_path = os.path.join(BOOKS_DIR, args.book_id, "lessons", f"{args.lesson_id}.json")
    if not os.path.exists(lesson_path):
        print(
            f"error: lesson file not found at {lesson_path}",
            file=sys.stderr,
        )
        return 1

    with open(lesson_path, "r", encoding="utf-8") as f:
        lesson = json.load(f)

    script_text = generate_script(lesson, dialect)

    if not args.no_write:
        video = lesson.setdefault("video", {}) or {}
        video["script_text"] = script_text
        if "voice" not in video or not video.get("voice"):
            cfg = load_config()
            tts_voice = (
                cfg.get("stage_5_video_factory", {}).get("tts", {}).get("voice")
                or "ar-EG-SalmaNeural"
            )
            video["voice"] = tts_voice
        lesson["video"] = video
        # Persist the lesson with the new script_text.
        os.makedirs(os.path.dirname(lesson_path), exist_ok=True)
        with open(lesson_path, "w", encoding="utf-8") as f:
            json.dump(lesson, f, ensure_ascii=False, indent=2)

    # Print to stdout for the calling orchestrator to capture.
    print(script_text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
