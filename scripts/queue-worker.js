#!/usr/bin/env node
/**
 * queue-worker.js
 * ---------------
 * Background worker that processes the video generation queue.
 *
 * Polls `lib/db/queue.getNext()` every 5 seconds. When an item is found,
 * runs `scripts/render-video.js --book-id=... --lesson-id=...` as a child
 * process and reports the result back to the queue via `markCompleted` /
 * `markFailed`.
 *
 * Optional: emits Socket.io updates to a running dashboard server. When the
 * DASHBOARD_SOCKET_IO_PORT env var is set (or defaults to 3001), the worker
 * attempts to connect and emit `video:progress` events. If the dashboard is
 * not running, the worker simply logs to stdout.
 *
 * Usage:
 *   node scripts/queue-worker.js
 *
 * Env vars:
 *   QUEUE_POLL_INTERVAL_MS   (default 5000)
 *   DASHBOARD_SOCKET_IO_PORT (default 3001)
 *   EXIT_WHEN_EMPTY          (default false) - if "1", exits when no items.
 */

"use strict";

const path = require("path");
const { spawn } = require("child_process");
const queue = require("../lib/db/queue");
const lessons = require("../lib/db/lessons");

const ROOT = path.join(__dirname, "..");
const POLL_INTERVAL_MS = Number(process.env.QUEUE_POLL_INTERVAL_MS || 5000);
const DASHBOARD_PORT = Number(process.env.DASHBOARD_SOCKET_IO_PORT || 3001);

let shuttingDown = false;
let ioClient = null;

// --- Optional Socket.io client ------------------------------------------
function tryConnectSocketIo() {
  try {
    // socket.io-client isn't a declared dependency, but if it is present we
    // use it to forward progress events to any dashboard server running on
    // DASHBOARD_PORT.  Failure to connect is non-fatal.
    const { io } = require("socket.io-client");
    ioClient = io(`http://localhost:${DASHBOARD_PORT}`, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      timeout: 2000,
    });
    ioClient.on("connect", () => {
      log(`Connected to dashboard Socket.io at port ${DASHBOARD_PORT}`);
    });
    ioClient.on("connect_error", () => {
      // silent - dashboard is optional
    });
    ioClient.on("disconnect", () => {
      // silent
    });
  } catch (err) {
    ioClient = null;
  }
}

function emit(event, payload) {
  if (!ioClient) return;
  try {
    ioClient.emit(event, payload);
  } catch {
    /* ignore */
  }
}

// --- Logging ------------------------------------------------------------
function log(msg, level = "INFO") {
  const line = `[${new Date().toISOString()}] [queue-worker] [${level}] ${msg}`;
  console.log(line);
}

// --- Pipeline -----------------------------------------------------------
async function processItem(item) {
  const { book_id, lesson_id } = item;
  log(`Processing lesson ${book_id}/${lesson_id} ...`);

  emit("video:progress", {
    bookId: book_id,
    lessonId: lesson_id,
    status: "processing",
    message: "Starting render",
  });

  // Mark lesson as generating (so the dashboard reflects it immediately)
  try {
    lessons.updateVideoStatus(book_id, lesson_id, { status: "generating" });
  } catch (err) {
    log(`Could not mark lesson as generating: ${err.message}`, "WARN");
  }

  const child = spawn(
    "node",
    [
      path.join(ROOT, "scripts", "render-video.js"),
      `--book-id=${book_id}`,
      `--lesson-id=${lesson_id}`,
    ],
    { cwd: ROOT, stdio: "inherit" },
  );

  return new Promise((resolve) => {
    child.on("close", (code) => {
      if (code === 0) {
        // Read final metadata to know file size + url.
        let videoUrl = null;
        let fileSizeMb = null;
        try {
          const lesson = lessons.getLesson(book_id, lesson_id);
          if (lesson && lesson.video) {
            videoUrl = lesson.video.video_url || null;
            fileSizeMb = lesson.video.file_size_mb || null;
          }
        } catch (err) {
          log(`Could not read final lesson metadata: ${err.message}`, "WARN");
        }
        queue.markCompleted(book_id, lesson_id, videoUrl, fileSizeMb);
        log(`Completed ${book_id}/${lesson_id} (${fileSizeMb ?? "?"} MB)`);
        emit("video:progress", {
          bookId: book_id,
          lessonId: lesson_id,
          status: "completed",
          video_url: videoUrl,
          file_size_mb: fileSizeMb,
        });
        resolve(true);
      } else {
        const errMsg = `render-video.js exited with code ${code}`;
        queue.markFailed(book_id, lesson_id, errMsg);
        try {
          lessons.updateVideoStatus(book_id, lesson_id, {
            status: "failed",
            render_log: errMsg,
          });
        } catch {
          /* ignore */
        }
        log(`Failed ${book_id}/${lesson_id}: ${errMsg}`, "ERROR");
        emit("video:progress", {
          bookId: book_id,
          lessonId: lesson_id,
          status: "failed",
          error: errMsg,
        });
        resolve(false);
      }
    });
    child.on("error", (err) => {
      const errMsg = `spawn error: ${err.message}`;
      queue.markFailed(book_id, lesson_id, errMsg);
      try {
        lessons.updateVideoStatus(book_id, lesson_id, {
          status: "failed",
          render_log: errMsg,
        });
      } catch {
        /* ignore */
      }
      log(`Failed ${book_id}/${lesson_id}: ${errMsg}`, "ERROR");
      emit("video:progress", {
        bookId: book_id,
        lessonId: lesson_id,
        status: "failed",
        error: errMsg,
      });
      resolve(false);
    });
  });
}

async function tick() {
  if (shuttingDown) return;
  let item = null;
  try {
    item = queue.getNext();
  } catch (err) {
    log(`Error reading queue: ${err.message}`, "ERROR");
    return;
  }
  if (!item) {
    if (process.env.EXIT_WHEN_EMPTY === "1") {
      log("Queue empty, exiting (EXIT_WHEN_EMPTY=1).");
      gracefulShutdown(0);
    }
    return;
  }
  await processItem(item);
}

function gracefulShutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  log("Shutting down ...");
  if (ioClient) {
    try { ioClient.close(); } catch { /* ignore */ }
  }
  // Allow pending console writes to flush.
  setTimeout(() => process.exit(code), 200);
}

// --- Signal handlers ----------------------------------------------------
process.on("SIGINT", () => gracefulShutdown(0));
process.on("SIGTERM", () => gracefulShutdown(0));
process.on("uncaughtException", (err) => {
  log(`Uncaught exception: ${err.stack || err.message}`, "ERROR");
});
process.on("unhandledRejection", (reason) => {
  log(`Unhandled rejection: ${reason}`, "ERROR");
});

// --- Main loop ----------------------------------------------------------
async function main() {
  log(`Queue worker starting (poll interval = ${POLL_INTERVAL_MS}ms)`);
  tryConnectSocketIo();

  // Run an initial tick immediately.
  await tick();
  const interval = setInterval(async () => {
    try {
      await tick();
    } catch (err) {
      log(`Tick failed: ${err.message}`, "ERROR");
    }
    if (shuttingDown) {
      clearInterval(interval);
    }
  }, POLL_INTERVAL_MS);
}

main();
