#!/usr/bin/env node
/**
 * export-education.js
 * -------------------
 * Generates an export JSON file suitable for uploading to the education
 * platform.  The file is written to `data/books/<bookId>/education-export.json`
 * and contains the book metadata plus per-lesson summary, video_url, and the
 * quiz questions / formulas.
 *
 * Usage:
 *   node scripts/export-education.js --book-id=physics-3rd-secondary
 *   node scripts/export-education.js --book-id=physics-3rd-secondary --lesson-id=lesson-1-1
 *   node scripts/export-education.js --book-id=physics-3rd-secondary --pretty
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BOOKS_DIR = path.join(ROOT, "data", "books");

function parseArgs(argv) {
  const out = { bookId: null, lessonId: null, pretty: false };
  for (const arg of argv.slice(2)) {
    if (arg.startsWith("--book-id=")) out.bookId = arg.slice("--book-id=".length);
    else if (arg.startsWith("--lesson-id=")) out.lessonId = arg.slice("--lesson-id=".length);
    else if (arg === "--pretty") out.pretty = true;
  }
  return out;
}

function calcDurationSec(scenes) {
  if (!Array.isArray(scenes) || scenes.length === 0) return null;
  return Number(
    scenes.reduce((sum, s) => sum + (s.duration_sec || 0), 0).toFixed(2),
  );
}

function buildLessonExport(bookId, lessonId) {
  const lessonPath = path.join(BOOKS_DIR, bookId, "lessons", `${lessonId}.json`);
  if (!fs.existsSync(lessonPath)) {
    throw new Error(`Lesson file not found: ${lessonPath}`);
  }
  const lesson = JSON.parse(fs.readFileSync(lessonPath, "utf-8"));
  const content = lesson.content || {};
  const video = lesson.video || {};

  return {
    lesson_id: lessonId,
    title: lesson.metadata?.title || lessonId,
    subtitle: lesson.metadata?.subtitle || null,
    summary: content.summary || "",
    objectives: content.objectives || [],
    video_url: video.video_url || null,
    video_status: video.status || "not_generated",
    duration_sec: video.duration_sec || calcDurationSec(lesson.scenes) || null,
    file_size_mb: video.file_size_mb ?? null,
    rendered_at: video.rendered_at || null,
    formulas: (content.formulas || []).map((f) => ({
      id: f.id,
      latex: f.latex || "",
      description: f.description || "",
      variables: f.variables || [],
    })),
    questions: (lesson.questions || []).map((q) => ({
      id: q.id,
      type: q.type,
      difficulty: q.difficulty || null,
      question: q.question,
      options: q.options || null,
      correct_index: q.correct_index ?? null,
      answer: q.answer || null,
      explanation: q.explanation || "",
      formula_used: q.formula_used || null,
    })),
    tables: (lesson.tables || []).map((t) => ({
      id: t.id,
      title: t.title,
      headers: t.headers,
      rows: t.rows,
    })),
    definitions: content.definitions || [],
  };
}

function exportBook(bookId, lessonIdFilter, pretty) {
  const masterPath = path.join(BOOKS_DIR, bookId, "master.json");
  if (!fs.existsSync(masterPath)) {
    throw new Error(`Book not found: ${bookId} (expected master.json at ${masterPath})`);
  }
  const master = JSON.parse(fs.readFileSync(masterPath, "utf-8"));
  const book = master.book || {};

  // Gather lessons either from the filter or from the master tree.
  let lessonEntries = [];
  if (lessonIdFilter) {
    lessonEntries = [{ id: lessonIdFilter }];
  } else {
    for (const unit of master.units || []) {
      for (const l of unit.lessons || []) {
        lessonEntries.push({ id: l.id, unit_title: unit.title });
      }
    }
  }

  const lessons = [];
  for (const entry of lessonEntries) {
    try {
      lessons.push(buildLessonExport(bookId, entry.id));
    } catch (err) {
      console.error(`  ! skipping ${entry.id}: ${err.message}`);
    }
  }

  const exported = {
    exported_at: new Date().toISOString(),
    book: {
      id: book.id,
      title: book.title,
      subject: book.subject,
      grade: book.grade,
      publisher: book.publisher || null,
      total_pages: book.total_pages || 0,
    },
    lessons,
  };

  const outPath = path.join(BOOKS_DIR, bookId, "education-export.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify(exported, null, pretty ? 2 : 0),
    "utf-8",
  );

  const totalLessons = lessons.length;
  const generatedCount = lessons.filter((l) => l.video_status === "generated").length;
  console.log(
    `✅ Exported ${totalLessons} lesson(s) (${generatedCount} with video) → ${path.relative(ROOT, outPath)}`,
  );
  return outPath;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.bookId) {
    console.error("Usage: node scripts/export-education.js --book-id=<book> [--lesson-id=<lesson>] [--pretty]");
    process.exit(2);
  }
  try {
    exportBook(args.bookId, args.lessonId, args.pretty);
  } catch (err) {
    console.error(`❌ Export failed: ${err.message}`);
    process.exit(1);
  }
}

main();
