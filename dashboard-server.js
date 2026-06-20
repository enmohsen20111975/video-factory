/**
 * Unified Video Factory - Dashboard Backend Server
 * --------------------------------------------------
 * Express + Socket.io REST API server.
 *
 * Serves on port 3001 and provides:
 *   - /api/books/...           Books CRUD + extraction control
 *   - /api/books/:bookId/lessons/...  Lessons CRUD + images + review
 *   - /api/videos/...          Video generation queue + streaming
 *   - /api/config              Pipeline config
 *   - /api/system/status       System resources (CPU/RAM/Disk/GPU)
 *   - /data/*                  Static images, videos and PDFs
 *
 * Realtime events are emitted via socket.io:
 *   - extraction-progress
 *   - video-progress
 *   - queue-update
 *   - log
 *
 * @module dashboard-server
 */

const express = require('express');
const http = require('http');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { Server } = require('socket.io');
const { exec, execSync, spawn } = require('child_process');
const crypto = require('crypto');

// DB access layers
const books = require('./lib/db/books');
const lessons = require('./lib/db/lessons');
const queue = require('./lib/db/queue');
const config = require('./lib/db/config');

// ------------------------------------------------------------------
// Constants & paths
// ------------------------------------------------------------------
const PORT = process.env.PORT || 3001;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const BOOKS_DIR = books.BOOKS_DIR; // data/books

// Ensure data dirs exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(BOOKS_DIR)) fs.mkdirSync(BOOKS_DIR, { recursive: true });

// ------------------------------------------------------------------
// App setup
// ------------------------------------------------------------------
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] },
});

// JSON body parser with 100mb limit (lessons can include big raw_text)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// CORS for all origins
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.options('*', cors());

// Simple timestamped logging middleware
app.use((req, _res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.originalUrl}`);
  next();
});

// Static serving for /data -> frontend can fetch images/videos via
// /data/books/{bookId}/images/{lessonId}/img-001.png
app.use('/data', express.static(DATA_DIR, {
  fallthrough: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
    }
  },
}));

// ------------------------------------------------------------------
// Multer storage helpers
// ------------------------------------------------------------------
const pdfStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const bookId = req.params.bookId || req.body.bookId;
    if (bookId) {
      const dir = path.join(BOOKS_DIR, bookId);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } else {
      // tmp dir for new uploads where bookId not known yet
      const tmp = path.join(BOOKS_DIR, '_uploads');
      fs.mkdirSync(tmp, { recursive: true });
      cb(null, tmp);
    }
  },
  filename: (_req, file, cb) => {
    cb(null, 'source.pdf');
  },
});

const imageStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const { bookId, lessonId } = req.params;
    const dir = path.join(BOOKS_DIR, bookId, 'images', lessonId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const id = crypto.randomBytes(4).toString('hex');
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `img-${id}${ext}`);
  },
});

const uploadPdf = multer({
  storage: pdfStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// ------------------------------------------------------------------
// Response helpers
// ------------------------------------------------------------------
function ok(res, data, code = 200) {
  return res.status(code).json({ success: true, data });
}
function fail(res, message, code = 400) {
  return res.status(code).json({ success: false, error: message });
}
function notFound(res, message = 'Not found') {
  return res.status(404).json({ success: false, error: message });
}

// async handler wrapper to catch errors
function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  });
}

// ------------------------------------------------------------------
// Helper utilities
// ------------------------------------------------------------------
function getPdfPageCount(pdfPath) {
  try {
    if (pdfPath && fs.existsSync(pdfPath)) {
      const out = execSync(`pdfinfo "${pdfPath}" 2>/dev/null`, { encoding: 'utf-8' });
      const m = out.match(/Pages:\s+(\d+)/i);
      if (m) return parseInt(m[1], 10);
    }
  } catch (_) { /* ignore */ }
  return 0;
}

function getBookOr404(res, bookId) {
  const master = books.getBook(bookId);
  if (!master) {
    notFound(res, `Book '${bookId}' not found`);
    return null;
  }
  return master;
}

function getLessonOr404(res, bookId, lessonId) {
  const lesson = lessons.getLesson(bookId, lessonId);
  if (!lesson) {
    notFound(res, `Lesson '${lessonId}' not found in book '${bookId}'`);
    return null;
  }
  return lesson;
}

// ------------------------------------------------------------------
// Books API
// ------------------------------------------------------------------

// GET /api/books - list all books
app.get('/api/books', wrap((req, res) => {
  const list = books.listBooks();
  return ok(res, list);
}));

// POST /api/books/upload - upload PDF, create book
app.post('/api/books/upload', (req, res, next) => {
  // Pre-parse: multer saves to BOOKS_DIR/_uploads/source.pdf since bookId
  // is not known until we generate it from the title.
  uploadPdf.single('pdf')(req, res, (err) => {
    if (err) return fail(res, err.message || 'Upload failed', 400);
    next();
  });
}, wrap(async (req, res) => {
  if (!req.file) return fail(res, 'No PDF file uploaded (field name must be "pdf")', 400);

  const title = req.body.title || path.basename(req.file.originalname, '.pdf');
  const subject = req.body.subject || 'other';
  const grade = req.body.grade || '3rd-secondary';
  const publisher = req.body.publisher || '';

  // Generate a unique book id (collision-safe)
  let bookId = books.generateBookId(title);
  while (books.bookExists(bookId)) {
    bookId = books.generateBookId(title);
  }

  // Create master.json + book directory structure (lessons/, images/, videos/)
  // createBook will mkdir the book directory itself.
  const master = books.createBook({
    id: bookId,
    title,
    subject,
    grade,
    publisher,
    source_pdf: `books/${bookId}/source.pdf`,
    total_pages: 0,
  });

  // Now move the uploaded PDF into the freshly-created book directory.
  const finalPath = path.join(BOOKS_DIR, bookId, 'source.pdf');
  if (req.file.path !== finalPath) {
    fs.renameSync(req.file.path, finalPath);
  }

  // Inspect page count and update master
  const totalPages = getPdfPageCount(finalPath);
  master.book.total_pages = totalPages;
  master.book.source_pdf = `books/${bookId}/source.pdf`;
  books.saveBook(bookId, master);

  io.emit('log', { level: 'info', msg: `Book '${title}' uploaded as ${bookId} (${totalPages} pages)` });
  return ok(res, master, 201);
}));

// GET /api/books/:bookId - get full master
app.get('/api/books/:bookId', wrap((req, res) => {
  const master = getBookOr404(res, req.params.bookId);
  if (!master) return;
  return ok(res, master);
}));

// DELETE /api/books/:bookId - delete book and all data
app.delete('/api/books/:bookId', wrap((req, res) => {
  if (!books.bookExists(req.params.bookId)) return notFound(res, `Book '${req.params.bookId}' not found`);
  books.deleteBook(req.params.bookId);
  io.emit('log', { level: 'warn', msg: `Book ${req.params.bookId} deleted` });
  return ok(res, { bookId: req.params.bookId, deleted: true });
}));

// POST /api/books/:bookId/extract - start extraction
app.post('/api/books/:bookId/extract', wrap((req, res) => {
  const master = getBookOr404(res, req.params.bookId);
  if (!master) return;

  // Mark as extracting (actual python process is handled separately by
  // content-extractor scripts; here we just flag the status so the UI
  // can update. Real worker reads this status from master.json.)
  books.updateExtractionStatus(req.params.bookId, 'extracting', 0);

  // Attempt to spawn python extractor in background (best-effort).
  try {
    const extractorScript = path.join(ROOT_DIR, 'content-extractor', 'run-all.py');
    if (fs.existsSync(extractorScript)) {
      const py = spawn('python3', [extractorScript, '--book-id', req.params.bookId], {
        cwd: ROOT_DIR,
        detached: true,
        stdio: 'ignore',
      });
      py.unref();
      console.log(`[extract] spawned python pid=${py.pid} for ${req.params.bookId}`);
    } else {
      console.warn(`[extract] ${extractorScript} not found - skipping actual extraction`);
    }
  } catch (e) {
    console.warn(`[extract] failed to spawn extractor: ${e.message}`);
  }

  io.emit('extraction-progress', { bookId: req.params.bookId, status: 'extracting', progress: 0 });
  io.emit('log', { level: 'info', msg: `Extraction started for ${req.params.bookId}` });

  return ok(res, { bookId: req.params.bookId, status: 'extracting', progress: 0 });
}));

// GET /api/books/:bookId/extract/status
app.get('/api/books/:bookId/extract/status', wrap((req, res) => {
  const master = getBookOr404(res, req.params.bookId);
  if (!master) return;
  return ok(res, {
    bookId: req.params.bookId,
    status: master.book.extraction_status,
    progress: master.book.extraction_progress,
  });
}));

// POST /api/books/:bookId/extract/stop
app.post('/api/books/:bookId/extract/stop', wrap((req, res) => {
  const master = getBookOr404(res, req.params.bookId);
  if (!master) return;

  // Mark back to pending (real impl would kill the python child)
  books.updateExtractionStatus(req.params.bookId, 'pending', master.book.extraction_progress || 0);

  io.emit('extraction-progress', { bookId: req.params.bookId, status: 'pending', progress: master.book.extraction_progress || 0 });
  io.emit('log', { level: 'warn', msg: `Extraction stopped for ${req.params.bookId}` });

  return ok(res, { bookId: req.params.bookId, status: 'pending' });
}));

// GET /api/books/:bookId/logs - read extraction.log
app.get('/api/books/:bookId/logs', wrap((req, res) => {
  const logPath = path.join(BOOKS_DIR, req.params.bookId, 'extraction.log');
  if (!fs.existsSync(logPath)) {
    return ok(res, { bookId: req.params.bookId, logs: '', exists: false });
  }
  // Limit output to last 1MB to avoid huge payloads
  const stat = fs.statSync(logPath);
  const maxBytes = 1024 * 1024;
  let content;
  if (stat.size > maxBytes) {
    const fd = fs.openSync(logPath, 'r');
    const buf = Buffer.alloc(maxBytes);
    fs.readSync(fd, buf, 0, maxBytes, stat.size - maxBytes);
    fs.closeSync(fd);
    content = '... (truncated) ...\n' + buf.toString('utf-8');
  } else {
    content = fs.readFileSync(logPath, 'utf-8');
  }
  return ok(res, { bookId: req.params.bookId, logs: content, exists: true, size: stat.size });
}));

// ------------------------------------------------------------------
// Lessons API
// ------------------------------------------------------------------

// GET /api/books/:bookId/lessons - list lesson summaries
app.get('/api/books/:bookId/lessons', wrap((req, res) => {
  if (!books.bookExists(req.params.bookId)) return notFound(res, `Book '${req.params.bookId}' not found`);
  const list = lessons.listLessons(req.params.bookId);
  if (list === null) return notFound(res, `Book '${req.params.bookId}' not found`);
  return ok(res, list);
}));

// GET /api/books/:bookId/lessons/:lessonId - get full lesson
app.get('/api/books/:bookId/lessons/:lessonId', wrap((req, res) => {
  const lesson = getLessonOr404(res, req.params.bookId, req.params.lessonId);
  if (!lesson) return;
  return ok(res, lesson);
}));

// PUT /api/books/:bookId/lessons/:lessonId - update full lesson
app.put('/api/books/:bookId/lessons/:lessonId', wrap((req, res) => {
  const existing = getLessonOr404(res, req.params.bookId, req.params.lessonId);
  if (!existing) return;

  const newLesson = req.body;
  if (!newLesson || typeof newLesson !== 'object') {
    return fail(res, 'Request body must be a lesson object', 400);
  }
  // Ensure ids are preserved
  newLesson.metadata = newLesson.metadata || existing.metadata || {};
  newLesson.metadata.book_id = req.params.bookId;
  newLesson.metadata.lesson_id = req.params.lessonId;

  lessons.saveLesson(req.params.bookId, req.params.lessonId, newLesson);
  return ok(res, newLesson);
}));

// POST /api/books/:bookId/lessons/:lessonId/images - upload image
app.post('/api/books/:bookId/lessons/:lessonId/images', (req, res, next) => {
  uploadImage.single('image')(req, res, (err) => {
    if (err) return fail(res, err.message || 'Image upload failed', 400);
    next();
  });
}, wrap((req, res) => {
  const lesson = getLessonOr404(res, req.params.bookId, req.params.lessonId);
  if (!lesson) {
    // Cleanup uploaded file
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return;
  }
  if (!req.file) return fail(res, 'No image uploaded (field name must be "image")', 400);

  // relative path stored in master: books/{bookId}/images/{lessonId}/{filename}
  const relPath = path.relative(BOOKS_DIR, req.file.path).split(path.sep).join('/');

  const image = lessons.addImage(req.params.bookId, req.params.lessonId, {
    source_page: parseInt(req.body.source_page || 0, 10),
    path: relPath,
    description: req.body.description || '',
    type: req.body.type || 'illustration',
    width: parseInt(req.body.width || 0, 10),
    height: parseInt(req.body.height || 0, 10),
    uploaded_by: 'dashboard',
  });

  io.emit('log', { level: 'info', msg: `Image added to ${req.params.lessonId}: ${relPath}` });
  return ok(res, image, 201);
}));

// DELETE /api/books/:bookId/lessons/:lessonId/images/:imageId
app.delete('/api/books/:bookId/lessons/:lessonId/images/:imageId', wrap((req, res) => {
  const lesson = getLessonOr404(res, req.params.bookId, req.params.lessonId);
  if (!lesson) return;
  const removed = lessons.deleteImage(req.params.bookId, req.params.lessonId, req.params.imageId);
  if (!removed) return notFound(res, `Image '${req.params.imageId}' not found`);
  return ok(res, { imageId: req.params.imageId, deleted: true });
}));

// POST /api/books/:bookId/lessons/:lessonId/review - mark as reviewed
app.post('/api/books/:bookId/lessons/:lessonId/review', wrap((req, res) => {
  const lesson = getLessonOr404(res, req.params.bookId, req.params.lessonId);
  if (!lesson) return;
  const notes = (req.body && req.body.notes) || '';
  const updated = lessons.markAsReviewed(req.params.bookId, req.params.lessonId, notes);
  io.emit('log', { level: 'info', msg: `Lesson ${req.params.lessonId} marked as reviewed` });
  return ok(res, updated);
}));

// ------------------------------------------------------------------
// Videos API
// ------------------------------------------------------------------

// GET /api/videos/queue
app.get('/api/videos/queue', wrap((req, res) => {
  const q = queue.getQueue();
  return ok(res, q);
}));

// POST /api/videos/generate/:bookId/:lessonId - add to queue
app.post('/api/videos/generate/:bookId/:lessonId', wrap((req, res) => {
  const lesson = getLessonOr404(res, req.params.bookId, req.params.lessonId);
  if (!lesson) return;
  const title = lesson.metadata?.title || req.params.lessonId;

  const added = queue.addToQueue(req.params.bookId, req.params.lessonId, title);
  if (!added) {
    return fail(res, 'Lesson already in queue', 409);
  }

  // Update lesson video status to 'generating'
  lessons.updateVideoStatus(req.params.bookId, req.params.lessonId, {
    status: 'generating',
  });

  io.emit('queue-update', queue.getQueue());
  io.emit('log', { level: 'info', msg: `Video generation queued for ${req.params.lessonId}` });
  return ok(res, { bookId: req.params.bookId, lessonId: req.params.lessonId, status: 'generating' });
}));

// POST /api/videos/generate-batch - body: { book_id, lesson_ids: [] }
app.post('/api/videos/generate-batch', wrap((req, res) => {
  const { book_id, lesson_ids } = req.body || {};
  if (!book_id || !Array.isArray(lesson_ids)) {
    return fail(res, 'Body must include {book_id, lesson_ids: []}', 400);
  }
  if (!books.bookExists(book_id)) return notFound(res, `Book '${book_id}' not found`);

  const results = [];
  for (const lessonId of lesson_ids) {
    const lesson = lessons.getLesson(book_id, lessonId);
    if (!lesson) {
      results.push({ lessonId, ok: false, error: 'Lesson not found' });
      continue;
    }
    const title = lesson.metadata?.title || lessonId;
    const added = queue.addToQueue(book_id, lessonId, title);
    if (added) {
      lessons.updateVideoStatus(book_id, lessonId, { status: 'generating' });
      results.push({ lessonId, ok: true, status: 'generating' });
    } else {
      results.push({ lessonId, ok: false, error: 'Already in queue' });
    }
  }
  io.emit('queue-update', queue.getQueue());
  io.emit('log', { level: 'info', msg: `Batch generate: ${results.filter(r => r.ok).length}/${lesson_ids.length} added` });
  return ok(res, { book_id, results });
}));

// GET /api/videos/status/:bookId/:lessonId
app.get('/api/videos/status/:bookId/:lessonId', wrap((req, res) => {
  const lesson = getLessonOr404(res, req.params.bookId, req.params.lessonId);
  if (!lesson) return;
  return ok(res, {
    bookId: req.params.bookId,
    lessonId: req.params.lessonId,
    video: lesson.video || { status: 'not_generated' },
  });
}));

// POST /api/videos/cancel/:bookId/:lessonId
app.post('/api/videos/cancel/:bookId/:lessonId', wrap((req, res) => {
  const lesson = getLessonOr404(res, req.params.bookId, req.params.lessonId);
  if (!lesson) return;
  const cancelled = queue.cancelJob(req.params.bookId, req.params.lessonId);

  lessons.updateVideoStatus(req.params.bookId, req.params.lessonId, { status: 'cancelled' });
  io.emit('queue-update', queue.getQueue());
  io.emit('log', { level: 'warn', msg: `Video cancelled for ${req.params.lessonId}` });

  return ok(res, { bookId: req.params.bookId, lessonId: req.params.lessonId, status: 'cancelled', was_in_queue: cancelled });
}));

// GET /api/videos/:bookId/:lessonId/file - stream MP4
app.get('/api/videos/:bookId/:lessonId/file', wrap((req, res) => {
  const videoPath = path.join(BOOKS_DIR, req.params.bookId, 'videos', `${req.params.lessonId}.mp4`);
  if (!fs.existsSync(videoPath)) {
    return notFound(res, `Video file not found for lesson ${req.params.lessonId}`);
  }
  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    // Support HTTP range requests for streaming
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;
    const stream = fs.createReadStream(videoPath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    });
    stream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(videoPath).pipe(res);
  }
}));

// POST /api/videos/export-education - body: { book_id } or { book_id, lesson_ids: [] }
app.post('/api/videos/export-education', wrap((req, res) => {
  const { book_id, lesson_ids } = req.body || {};
  if (!book_id) return fail(res, 'Body must include book_id', 400);
  const master = getBookOr404(res, book_id);
  if (!master) return;

  // Determine target lessons
  let targetLessonIds = Array.isArray(lesson_ids) && lesson_ids.length > 0
    ? lesson_ids
    : null;

  const exportData = {
    book: {
      id: master.book.id,
      title: master.book.title,
      subject: master.book.subject,
      grade: master.book.grade,
    },
    exported_at: new Date().toISOString(),
    lessons: [],
  };

  for (const unit of master.units || []) {
    for (const lessonSummary of unit.lessons || []) {
      if (targetLessonIds && !targetLessonIds.includes(lessonSummary.id)) continue;
      const lesson = lessons.getLesson(book_id, lessonSummary.id);
      if (!lesson) continue;

      exportData.lessons.push({
        lesson_id: lesson.metadata.lesson_id,
        title: lesson.metadata.title,
        unit_title: unit.title,
        video_url: lesson.video?.video_url
          ? lesson.video.video_url
          : `/data/books/${book_id}/videos/${lessonSummary.id}.mp4`,
        video_status: lesson.video?.status || 'not_generated',
        duration_sec: lesson.video?.duration_sec || 0,
        summary: lesson.content?.summary || '',
        objectives: lesson.content?.objectives || [],
        questions: lesson.questions || [],
      });
    }
  }

  const exportPath = path.join(BOOKS_DIR, book_id, 'education-export.json');
  fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2), 'utf-8');

  io.emit('log', { level: 'info', msg: `Education export created for ${book_id} (${exportData.lessons.length} lessons)` });
  return ok(res, {
    book_id,
    path: `data/books/${book_id}/education-export.json`,
    absolute_path: exportPath,
    lessons_count: exportData.lessons.length,
  });
}));

// ------------------------------------------------------------------
// Pipeline / Config API
// ------------------------------------------------------------------

// GET /api/config
app.get('/api/config', wrap((req, res) => {
  return ok(res, config.getConfig());
}));

// POST /api/config - save config
app.post('/api/config', wrap((req, res) => {
  const newConfig = req.body;
  if (!newConfig || typeof newConfig !== 'object') {
    return fail(res, 'Body must be a config object', 400);
  }
  const merged = config.saveConfig(newConfig);
  io.emit('log', { level: 'info', msg: 'Pipeline config updated' });
  return ok(res, merged);
}));

// POST /api/config/reset - reset to default (bonus endpoint)
app.post('/api/config/reset', wrap((req, res) => {
  const def = config.resetConfig();
  return ok(res, def);
}));

// ------------------------------------------------------------------
// System status API
// ------------------------------------------------------------------

function getGpuInfo() {
  try {
    const out = execSync('nvidia-smi --query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu --format=csv,noheader,nounits', {
      encoding: 'utf-8',
      timeout: 3000,
    }).trim();
    const parts = out.split(',').map((s) => s.trim());
    if (parts.length >= 5) {
      return {
        name: parts[0],
        vram_total_mb: parseInt(parts[1], 10),
        vram_used_mb: parseInt(parts[2], 10),
        vram_free_mb: parseInt(parts[3], 10),
        utilization_percent: parseInt(parts[4], 10),
      };
    }
  } catch (_) { /* no GPU or nvidia-smi missing */ }
  return null;
}

function getCpuPercent() {
  // Average load over 1 minute, normalized by CPU count -> rough percent
  const cpus = os.cpus().length || 1;
  const load = os.loadavg()[0]; // 1-min avg
  const percent = Math.min(100, Math.round((load / cpus) * 100));
  return percent;
}

function getDiskUsage(dirPath) {
  try {
    const out = execSync(`df -k "${dirPath}" | tail -1`, { encoding: 'utf-8' });
    const parts = out.trim().split(/\s+/);
    if (parts.length >= 4) {
      const total = parseInt(parts[1], 10) * 1024;
      const used = parseInt(parts[2], 10) * 1024;
      const free = parseInt(parts[3], 10) * 1024;
      const percent = total > 0 ? Math.round((used / total) * 100) : 0;
      return { total, used, free, percent };
    }
  } catch (_) { /* ignore */ }
  return { total: 0, used: 0, free: 0, percent: 0 };
}

// GET /api/system/status
app.get('/api/system/status', wrap((req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memPercent = totalMem > 0 ? Math.round((usedMem / totalMem) * 100) : 0;

  const data = {
    cpu_percent: getCpuPercent(),
    cpu_cores: os.cpus().length,
    cpu_model: os.cpus()[0]?.model || 'unknown',
    memory: {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      percent: memPercent,
    },
    disk: getDiskUsage(DATA_DIR),
    uptime_sec: Math.round(os.uptime()),
    platform: os.platform(),
    hostname: os.hostname(),
    node_version: process.version,
    timestamp: new Date().toISOString(),
  };

  const gpu = getGpuInfo();
  if (gpu) data.gpu = gpu;

  return ok(res, data);
}));

// ------------------------------------------------------------------
// Health check
// ------------------------------------------------------------------
app.get('/api/health', wrap((req, res) => {
  return ok(res, { status: 'ok', uptime: process.uptime(), port: PORT });
}));

// ------------------------------------------------------------------
// Socket.io setup
// ------------------------------------------------------------------
io.on('connection', (socket) => {
  console.log(`[socket.io] client connected: ${socket.id}`);
  socket.emit('log', { level: 'info', msg: 'Connected to dashboard server', ts: new Date().toISOString() });
  socket.on('disconnect', () => {
    console.log(`[socket.io] client disconnected: ${socket.id}`);
  });
});

// Expose io globally so other scripts can require this module and emit
app.set('io', io);

// ------------------------------------------------------------------
// Root welcome page (health check + quick links)
// ------------------------------------------------------------------
app.get('/', (req, res) => {
  const booksCount = (books.listBooks() || []).length;
  const queueState = queue.getQueue();
  const cfg = config.getConfig();
  const uptimeSec = Math.floor(process.uptime());

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🎬 Smart Video Factory - Backend</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, sans-serif;
      background: linear-gradient(135deg, #0B0F19 0%, #1E293B 100%);
      color: #F8FAFC;
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container { max-width: 900px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 40px; }
    .header h1 {
      font-size: 2.5rem;
      background: linear-gradient(to right, #6366F1, #A855F7, #EC4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 10px;
    }
    .header p { color: #94A3B8; font-size: 1.1rem; }
    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 30px;
    }
    .status-card {
      background: rgba(30, 41, 59, 0.6);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 20px;
      text-align: center;
    }
    .status-card .label { color: #94A3B8; font-size: 0.9rem; margin-bottom: 8px; }
    .status-card .value { font-size: 2rem; font-weight: 800; color: #6366F1; }
    .status-card .value.green { color: #10B981; }
    .status-card .value.amber { color: #F59E0B; }
    .info-box {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 20px;
    }
    .info-box h2 {
      color: #A855F7;
      font-size: 1.3rem;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .info-box p, .info-box li { color: #CBD5E1; line-height: 1.8; }
    .info-box code {
      background: rgba(99, 102, 241, 0.15);
      color: #818CF8;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: 'Consolas', monospace;
      font-size: 0.9rem;
    }
    .info-box a {
      color: #6366F1;
      text-decoration: none;
      border-bottom: 1px dashed;
    }
    .info-box a:hover { color: #818CF8; }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .badge.ok { background: rgba(16, 185, 129, 0.15); color: #10B981; }
    .badge.warn { background: rgba(245, 158, 11, 0.15); color: #F59E0B; }
    ul { list-style: none; padding-right: 0; }
    ul li { padding: 6px 0; }
    ul li::before { content: '▸ '; color: #6366F1; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎬 Smart Video Factory</h1>
      <p>Backend API Server - v2.0</p>
    </div>

    <div class="status-grid">
      <div class="status-card">
        <div class="label">📚 الكتب</div>
        <div class="value">${booksCount}</div>
      </div>
      <div class="status-card">
        <div class="label">🎬 في الانتظار</div>
        <div class="value amber">${queueState.pending_queue?.length || 0}</div>
      </div>
      <div class="status-card">
        <div class="label">⚙️ قيد التنفيذ</div>
        <div class="value amber">${queueState.active_jobs?.length || 0}</div>
      </div>
      <div class="status-card">
        <div class="label">⏱️ Uptime</div>
        <div class="value green">${Math.floor(uptimeSec / 60)}m</div>
      </div>
    </div>

    <div class="info-box">
      <h2>🚀 الخادم يعمل بنجاح</h2>
      <p>هذا هو خادم الـ API الخلفي. لوحة التحكم الأمامية تعمل على منفذ آخر:</p>
      <ul style="margin-top: 12px;">
        <li>🎨 <strong>لوحة التحكم (Frontend)</strong>: <code>http://localhost:3000</code></li>
        <li>🌐 <strong>API Server</strong>: <code>http://localhost:3001/api/*</code></li>
        <li>🔌 <strong>WebSocket</strong>: <code>ws://localhost:3001</code></li>
      </ul>
      <p style="margin-top: 16px;">
        <strong>⚠️ ملاحظة:</strong> لو لم تكن لوحة التحكم تعمل، شغلها بأمر:
        <br>
        <code style="display: inline-block; margin-top: 8px; padding: 8px 12px;">cd dashboard-app; npm run dev</code>
      </p>
    </div>

    <div class="info-box">
      <h2>📋 روابط API المهمة</h2>
      <ul>
        <li><a href="/api/books" target="_blank">GET /api/books</a> - قائمة الكتب</li>
        <li><a href="/api/config" target="_blank">GET /api/config</a> - الإعدادات</li>
        <li><a href="/api/system/status" target="_blank">GET /api/system/status</a> - حالة النظام</li>
        <li><a href="/api/videos/queue" target="_blank">GET /api/videos/queue</a> - قائمة انتظار الفيديو</li>
      </ul>
    </div>

    <div class="info-box">
      <h2>🤖 نماذج Ollama</h2>
      <p>النموذج الحالي المُعد: <code>${cfg.stage_2_vlm_extraction?.preferred_model || 'qwen2.5vl:7b'}</code></p>
      <p style="margin-top: 12px;">لتحميل النماذج الصحيحة (في Terminal منفصل):</p>
      <ul style="margin-top: 8px;">
        <li><code>ollama pull qwen2.5vl:7b</code> (الموصى به - الأحدث)</li>
        <li><code>ollama pull llama3.2-vision:11b</code> (بديل قوي)</li>
        <li><code>ollama pull gemma3:4b</code> (خفيف - fallback)</li>
      </ul>
    </div>
  </div>
</body>
</html>
  `);
});

// ------------------------------------------------------------------
// 404 + error handlers (last)
// ------------------------------------------------------------------
app.use((req, res) => {
  return notFound(res, `Route not found: ${req.method} ${req.originalUrl}`);
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error(`[FATAL]`, err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
  }
  return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

// ------------------------------------------------------------------
// Start
// ------------------------------------------------------------------
server.listen(PORT, () => {
  console.log('========================================================');
  console.log(`  🎬 Unified Video Factory - Dashboard Server`);
  console.log(`  📡 HTTP:  http://localhost:${PORT}`);
  console.log(`  🔌 WS:    ws://localhost:${PORT}`);
  console.log(`  📁 Data:  ${DATA_DIR}`);
  console.log(`  🚀 Ready  (pid ${process.pid})`);
  console.log('========================================================');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[shutdown] SIGINT received, closing server...');
  server.close(() => {
    io.close();
    process.exit(0);
  });
});
process.on('SIGTERM', () => {
  console.log('\n[shutdown] SIGTERM received, closing server...');
  server.close(() => {
    io.close();
    process.exit(0);
  });
});

module.exports = { app, server, io };
