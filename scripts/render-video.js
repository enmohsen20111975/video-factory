#!/usr/bin/env node
/**
 * render-video.js
 * ----------------
 * Main video production orchestrator.
 *
 * Takes a lesson.json file (referenced by --book-id and --lesson-id) and
 * produces a compressed MP4 video by running the full pipeline:
 *
 *   1. Load lesson.json from data/books/<bookId>/lessons/<lessonId>.json
 *   2. If `video.script_text` is missing, run generate-script.py.
 *   3. Run generate_tts.py to produce MP3 + timestamps JSON.
 *   4. Copy lesson.json, timestamps JSON and voiceover MP3 into `public/`
 *      using stable names (active-lesson.json / active-timestamps.json /
 *      active-voiceover.mp3) so Remotion's `staticFile()` can read them
 *      during the render. Any image referenced by the lesson scenes is
 *      also mirrored under `public/active-images/`.
 *   5. Calculate the total composition duration from the scenes array.
 *   6. Render with `npx remotion render LessonVideo ... --props=...`
 *   7. Compress the raw render with FFmpeg (H.264 / AAC).
 *   8. Delete the raw file.
 *   9. Update lesson.video.status / video_url / file_size_mb / rendered_at.
 *  10. Clean up the temporary public/ files.
 *
 * Each step is appended to `data/books/<bookId>/videos/<lessonId>.log`.
 * On any failure, `video.status` is set to `failed` and the error message
 * is saved into `video.render_log`.
 *
 * Usage:
 *   node scripts/render-video.js --book-id=physics --lesson-id=lesson-1-1
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync, spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const BOOKS_DIR = path.join(DATA_DIR, "books");
const PUBLIC_DIR = path.join(ROOT, "public");
const ACTIVE_LESSON = path.join(PUBLIC_DIR, "active-lesson.json");
const ACTIVE_TIMESTAMPS = path.join(PUBLIC_DIR, "active-timestamps.json");
const ACTIVE_VOICEOVER = path.join(PUBLIC_DIR, "active-voiceover.mp3");
const ACTIVE_IMAGES_DIR = path.join(PUBLIC_DIR, "active-images");

const FPS = 30;

// ----- Argument parsing -------------------------------------------------
function parseArgs(argv) {
  const out = { bookId: null, lessonId: null, skipTts: false, skipRender: false };
  for (const arg of argv.slice(2)) {
    if (arg.startsWith("--book-id=")) out.bookId = arg.slice("--book-id=".length);
    else if (arg.startsWith("--lesson-id=")) out.lessonId = arg.slice("--lesson-id=".length);
    else if (arg === "--skip-tts") out.skipTts = true;
    else if (arg === "--skip-render") out.skipRender = true;
  }
  return out;
}

// ----- Logging ----------------------------------------------------------
function makeLogger(logFile) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const stream = fs.createWriteStream(logFile, { flags: "a" });
  function log(msg, level = "INFO") {
    const line = `[${new Date().toISOString()}] [${level}] ${msg}`;
    console.log(line);
    stream.write(line + "\n");
  }
  log.close = () => stream.end();
  return log;
}

function run(cmd, args, opts = {}) {
  // Wrap spawnSync so we can stream stdio to the parent terminal and still
  // capture exit code + combined output for error reporting.
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf-8",
    stdio: opts.silent ? ["ignore", "pipe", "pipe"] : "inherit",
    ...opts,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const tail = (result.stdout || "") + (result.stderr || "");
    throw new Error(
      `Command "${cmd} ${args.join(" ")}" exited with status ${result.status}.\n${tail}`,
    );
  }
  return result;
}

// ----- Helpers ----------------------------------------------------------
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function fileExists(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function fileExistsAndNonEmpty(p) {
  try {
    return fs.statSync(p).size > 0;
  } catch {
    return false;
  }
}

function fileSizeMB(p) {
  try {
    return Number((fs.statSync(p).size / (1024 * 1024)).toFixed(2));
  } catch {
    return 0;
  }
}

function calcTotalFrames(scenes, fps) {
  if (!Array.isArray(scenes) || scenes.length === 0) return fps * 75;
  return scenes.reduce(
    (sum, s) => sum + Math.max(1, Math.round((s.duration_sec || 0) * fps)),
    0,
  );
}

// Copy any image referenced by the lesson into public/active-images/ so
// Remotion's staticFile() can serve them during the render.
function stageLessonImages(lesson, bookDir, log) {
  ensureDir(ACTIVE_IMAGES_DIR);
  // Clear stale entries
  for (const old of fs.readdirSync(ACTIVE_IMAGES_DIR)) {
    try {
      fs.unlinkSync(path.join(ACTIVE_IMAGES_DIR, old));
    } catch {
      /* ignore */
    }
  }

  const images = Array.isArray(lesson.images) ? lesson.images : [];
  let copied = 0;
  for (const img of images) {
    if (!img || !img.path) continue;
    // img.path is relative to the book directory, e.g. "images/lesson-1-1/img-001.png"
    const srcAbs = path.isAbsolute(img.path)
      ? img.path
      : path.join(bookDir, img.path);
    if (!fs.existsSync(srcAbs)) {
      log(`  - image skipped (not found): ${img.path}`, "WARN");
      continue;
    }
    const basename = path.basename(img.path);
    const dst = path.join(ACTIVE_IMAGES_DIR, basename);
    fs.copyFileSync(srcAbs, dst);
    copied += 1;
  }
  log(`  - staged ${copied} image(s) into public/active-images/`);
}

// Copy lesson + timestamps + voiceover into the public/ folder so Remotion
// can read them via staticFile(). Previous copies are overwritten.
function stagePublicAssets(lesson, timestampsPath, voiceoverPath, log) {
  ensureDir(PUBLIC_DIR);
  fs.writeFileSync(ACTIVE_LESSON, JSON.stringify(lesson, null, 2), "utf-8");
  log(`  - wrote ${path.relative(ROOT, ACTIVE_LESSON)}`);

  if (fs.existsSync(timestampsPath)) {
    fs.copyFileSync(timestampsPath, ACTIVE_TIMESTAMPS);
    log(`  - staged ${path.relative(ROOT, ACTIVE_TIMESTAMPS)}`);
  } else {
    // Provide an empty timestamps file so the fetch in LessonVideo doesn't 404.
    fs.writeFileSync(ACTIVE_TIMESTAMPS, "[]", "utf-8");
    log(`  - wrote empty ${path.relative(ROOT, ACTIVE_TIMESTAMPS)}`);
  }

  if (fs.existsSync(voiceoverPath)) {
    fs.copyFileSync(voiceoverPath, ACTIVE_VOICEOVER);
    log(`  - staged ${path.relative(ROOT, ACTIVE_VOICEOVER)}`);
  } else {
    log(`  - WARN: voiceover file missing at ${voiceoverPath}`, "WARN");
  }
}

function cleanupPublicAssets(log) {
  const files = [ACTIVE_LESSON, ACTIVE_TIMESTAMPS, ACTIVE_VOICEOVER];
  for (const f of files) {
    try {
      fs.unlinkSync(f);
      log(`  - removed ${path.relative(ROOT, f)}`);
    } catch {
      /* ignore */
    }
  }
  if (fs.existsSync(ACTIVE_IMAGES_DIR)) {
    try {
      fs.rmSync(ACTIVE_IMAGES_DIR, { recursive: true, force: true });
      log(`  - removed ${path.relative(ROOT, ACTIVE_IMAGES_DIR)}`);
    } catch {
      /* ignore */
    }
  }
}

// ----- Main pipeline ----------------------------------------------------
async function main() {
  const args = parseArgs(process.argv);

  if (!args.bookId || !args.lessonId) {
    console.error(
      "Usage: node scripts/render-video.js --book-id=<book> --lesson-id=<lesson>",
    );
    process.exit(2);
  }

  const bookDir = path.join(BOOKS_DIR, args.bookId);
  const lessonPath = path.join(bookDir, "lessons", `${args.lessonId}.json`);
  const videosDir = path.join(bookDir, "videos");
  const audioPath = path.join(videosDir, `${args.lessonId}.mp3`);
  const timestampsPath = path.join(videosDir, `${args.lessonId}-timestamps.json`);
  const rawVideoPath = path.join(videosDir, `${args.lessonId}-raw.mp4`);
  const finalVideoPath = path.join(videosDir, `${args.lessonId}.mp4`);
  const logFile = path.join(videosDir, `${args.lessonId}.log`);
  ensureDir(videosDir);

  const log = makeLogger(logFile);
  log(`=== render-video start (book=${args.bookId}, lesson=${args.lessonId}) ===`);

  if (!fs.existsSync(lessonPath)) {
    const msg = `Lesson file not found: ${lessonPath}`;
    log(msg, "ERROR");
    console.error(`\n❌ ${msg}`);
    console.error(`   Run this command on an existing lesson file at data/books/<book>/lessons/<lesson>.json.`);
    log.close();
    process.exit(1);
  }

  // Load lesson
  const lesson = JSON.parse(fs.readFileSync(lessonPath, "utf-8"));
  lesson.video = lesson.video || {};
  lesson.video.status = "generating";
  lesson.video.render_log = null;
  saveLesson(lessonPath, lesson);
  log("Lesson loaded. Status set to 'generating'.");

  try {
    // Step 1: ensure script_text
    if (!lesson.video.script_text || !lesson.video.script_text.trim()) {
      log("Step 1: generating voiceover script (lesson.video.script_text was empty)...");
      const result = run(
        "python",
        [
          path.join(ROOT, "scripts", "generate-script.py"),
          "--book-id", args.bookId,
          "--lesson-id", args.lessonId,
        ],
        { silent: true },
      );
      const scriptText = (result.stdout || "").trim();
      if (!scriptText) {
        throw new Error("generate-script.py produced no output.");
      }
      // Re-read lesson because generate-script.py wrote script_text back.
      const refreshed = JSON.parse(fs.readFileSync(lessonPath, "utf-8"));
      refreshed.video = refreshed.video || {};
      refreshed.video.script_text = scriptText;
      saveLesson(lessonPath, refreshed);
      Object.assign(lesson, refreshed);
      log(`  - script length: ${scriptText.length} chars`);
    } else {
      log("Step 1: script_text already present, skipping generation.");
    }

    const scriptText = lesson.video.script_text || "";
    const voice = lesson.video.voice || "ar-EG-SalmaNeural";

    // Step 2: TTS
    if (!args.skipTts) {
      log(`Step 2: generating TTS (voice=${voice}) ...`);
      run(
        "python",
        [
          path.join(ROOT, "scripts", "generate_tts.py"),
          "--text", scriptText,
          "--voice", voice,
          "--output-audio", audioPath,
          "--output-timestamps", timestampsPath,
        ],
      );
      if (!fileExistsAndNonEmpty(audioPath)) {
        throw new Error(`TTS audio was not produced at ${audioPath}`);
      }
      log(`  - audio: ${fileSizeMB(audioPath)} MB`);
      log(`  - timestamps: ${fileExists(timestampsPath) ? "ok" : "missing"}`);
    } else {
      log("Step 2: TTS skipped (--skip-tts).");
    }

    // Step 3: stage public assets
    log("Step 3: staging public assets for Remotion ...");
    stageLessonImages(lesson, bookDir, log);
    stagePublicAssets(lesson, timestampsPath, audioPath, log);

    // Step 4: calculate duration in frames
    const totalFrames = calcTotalFrames(lesson.scenes, FPS);
    log(`Step 4: total duration = ${totalFrames} frames (${(totalFrames / FPS).toFixed(2)}s)`);

    if (args.skipRender) {
      log("Step 5: render skipped (--skip-render).");
      log("=== render-video finished (skipped render) ===");
      cleanupPublicAssets(log);
      log.close();
      return;
    }

    // Step 5: Remotion render
    log("Step 5: rendering video with Remotion ...");
    const props = {
      bookId: args.bookId,
      lessonId: args.lessonId,
      durationInFramesOverride: totalFrames,
    };
    // Use a temp props file to avoid shell-quoting issues with long strings.
    const propsFile = path.join(videosDir, `${args.lessonId}-props.json`);
    fs.writeFileSync(propsFile, JSON.stringify(props), "utf-8");
    try {
      run(
        "npx",
        [
          "remotion",
          "render",
          "LessonVideo",
          rawVideoPath,
          `--props=${propsFile}`,
          "--concurrency=4",
          "--log=info",
        ],
      );
    } finally {
      try { fs.unlinkSync(propsFile); } catch { /* ignore */ }
    }
    if (!fileExistsAndNonEmpty(rawVideoPath)) {
      throw new Error(`Remotion did not produce a raw video at ${rawVideoPath}`);
    }
    log(`  - raw video: ${fileSizeMB(rawVideoPath)} MB`);

    // Step 6: FFmpeg compression
    log("Step 6: compressing with FFmpeg (libx264 / aac) ...");
    if (fs.existsSync(finalVideoPath)) {
      try { fs.unlinkSync(finalVideoPath); } catch { /* ignore */ }
    }
    run(
      "ffmpeg",
      [
        "-y",
        "-i", rawVideoPath,
        "-vcodec", "libx264",
        "-crf", "22",
        "-preset", "fast",
        "-pix_fmt", "yuv420p",
        "-acodec", "aac",
        "-b:a", "128k",
        finalVideoPath,
      ],
    );
    if (!fileExistsAndNonEmpty(finalVideoPath)) {
      throw new Error(`FFmpeg did not produce a final video at ${finalVideoPath}`);
    }
    const finalSize = fileSizeMB(finalVideoPath);
    log(`  - final video: ${finalSize} MB`);

    // Step 7: cleanup raw
    try {
      fs.unlinkSync(rawVideoPath);
      log("Step 7: removed raw render file.");
    } catch (err) {
      log(`Step 7: failed to remove raw render: ${err.message}`, "WARN");
    }

    // Step 8: update lesson.json
    log("Step 8: updating lesson.video metadata ...");
    const final = JSON.parse(fs.readFileSync(lessonPath, "utf-8"));
    final.video = final.video || {};
    final.video.status = "generated";
    final.video.video_url = `data/books/${args.bookId}/videos/${args.lessonId}.mp4`;
    final.video.file_size_mb = finalSize;
    final.video.duration_sec = Number((totalFrames / FPS).toFixed(2));
    final.video.rendered_at = new Date().toISOString();
    final.video.render_log = null;
    saveLesson(lessonPath, final);
    log(`  - status=generated, url=${final.video.video_url}`);

    // Step 9: cleanup public/ temp files
    log("Step 9: cleaning up public/ temp assets ...");
    cleanupPublicAssets(log);

    log("=== render-video finished OK ===");
    log.close();
    console.log(`\n✅ Video rendered: ${finalVideoPath}`);
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    log(`FAILED: ${message}`, "ERROR");
    log("=== render-video finished with errors ===");
    try {
      const final = JSON.parse(fs.readFileSync(lessonPath, "utf-8"));
      final.video = final.video || {};
      final.video.status = "failed";
      final.video.render_log = message;
      saveLesson(lessonPath, final);
      log("lesson.video.status set to 'failed'.");
    } catch (innerErr) {
      log(`Could not mark lesson as failed: ${innerErr.message}`, "ERROR");
    }
    cleanupPublicAssets(log);
    log.close();
    console.error(`\n❌ Render failed: ${message}`);
    process.exit(1);
  }
}

function saveLesson(lessonPath, lesson) {
  if (lesson.metadata) {
    lesson.metadata.updated_at = new Date().toISOString();
  }
  fs.writeFileSync(lessonPath, JSON.stringify(lesson, null, 2), "utf-8");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
