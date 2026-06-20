/**
 * Books Database Access Layer
 * Manages master.json files for each book
 * @module lib/db/books
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const BOOKS_DIR = path.join(DATA_DIR, 'books');

// Ensure directories exist
function ensureDirs() {
  if (!fs.existsSync(BOOKS_DIR)) {
    fs.mkdirSync(BOOKS_DIR, { recursive: true });
  }
}

/**
 * Get list of all books (without full details)
 * @returns {Array} List of book summaries
 */
function listBooks() {
  ensureDirs();
  const books = [];
  const entries = fs.readdirSync(BOOKS_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== '_template') {
      const masterPath = path.join(BOOKS_DIR, entry.name, 'master.json');
      if (fs.existsSync(masterPath)) {
        try {
          const master = JSON.parse(fs.readFileSync(masterPath, 'utf-8'));
          books.push({
            id: master.book.id,
            title: master.book.title,
            subject: master.book.subject,
            grade: master.book.grade,
            publisher: master.book.publisher,
            total_pages: master.book.total_pages,
            extraction_status: master.book.extraction_status,
            extraction_progress: master.book.extraction_progress,
            total_lessons: master.stats?.total_lessons || 0,
            videos_generated: master.stats?.videos_generated || 0,
            created_at: master.book.created_at,
          });
        } catch (e) {
          console.error(`Error reading book ${entry.name}:`, e.message);
        }
      }
    }
  }

  // Sort by created_at desc
  books.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return books;
}

/**
 * Get full book details including units and lessons
 * @param {string} bookId
 * @returns {object|null} Master book object
 */
function getBook(bookId) {
  ensureDirs();
  const masterPath = path.join(BOOKS_DIR, bookId, 'master.json');
  if (!fs.existsSync(masterPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(masterPath, 'utf-8'));
}

/**
 * Create a new book entry
 * @param {object} bookData - { title, subject, grade, publisher, source_pdf, total_pages }
 * @returns {object} Created master book
 */
function createBook(bookData) {
  ensureDirs();
  const bookId = bookData.id || generateBookId(bookData.title);
  const bookDir = path.join(BOOKS_DIR, bookId);

  if (fs.existsSync(bookDir)) {
    throw new Error(`Book with id '${bookId}' already exists`);
  }

  fs.mkdirSync(bookDir, { recursive: true });
  fs.mkdirSync(path.join(bookDir, 'lessons'), { recursive: true });
  fs.mkdirSync(path.join(bookDir, 'images'), { recursive: true });
  fs.mkdirSync(path.join(bookDir, 'videos'), { recursive: true });

  const now = new Date().toISOString();
  const master = {
    book: {
      id: bookId,
      title: bookData.title,
      subject: bookData.subject || 'other',
      grade: bookData.grade || '3rd-secondary',
      publisher: bookData.publisher || '',
      source_pdf: bookData.source_pdf || `books/${bookId}.pdf`,
      total_pages: bookData.total_pages || 0,
      cover_image: null,
      created_at: now,
      updated_at: now,
      extraction_status: 'pending',
      extraction_progress: 0,
    },
    units: [],
    stats: {
      total_units: 0,
      total_lessons: 0,
      extracted_lessons: 0,
      videos_generated: 0,
      videos_pending: 0,
    },
  };

  saveBook(bookId, master);
  return master;
}

/**
 * Save/update master.json
 * @param {string} bookId
 * @param {object} master
 */
function saveBook(bookId, master) {
  ensureDirs();
  const bookDir = path.join(BOOKS_DIR, bookId);
  if (!fs.existsSync(bookDir)) {
    fs.mkdirSync(bookDir, { recursive: true });
    fs.mkdirSync(path.join(bookDir, 'lessons'), { recursive: true });
    fs.mkdirSync(path.join(bookDir, 'images'), { recursive: true });
    fs.mkdirSync(path.join(bookDir, 'videos'), { recursive: true });
  }
  master.book.updated_at = new Date().toISOString();
  const masterPath = path.join(bookDir, 'master.json');
  fs.writeFileSync(masterPath, JSON.stringify(master, null, 2), 'utf-8');
}

/**
 * Delete a book and all its data
 * @param {string} bookId
 */
function deleteBook(bookId) {
  ensureDirs();
  const bookDir = path.join(BOOKS_DIR, bookId);
  if (!fs.existsSync(bookDir)) {
    return false;
  }
  fs.rmSync(bookDir, { recursive: true, force: true });
  return true;
}

/**
 * Update extraction status
 * @param {string} bookId
 * @param {string} status - pending|extracting|completed|failed|partial
 * @param {number} progress - 0-100
 */
function updateExtractionStatus(bookId, status, progress) {
  const master = getBook(bookId);
  if (!master) return null;

  master.book.extraction_status = status;
  master.book.extraction_progress = progress;
  saveBook(bookId, master);
  return master;
}

/**
 * Update book stats
 * @param {string} bookId
 */
function updateStats(bookId) {
  const master = getBook(bookId);
  if (!master) return null;

  let totalLessons = 0;
  let extractedLessons = 0;
  let videosGenerated = 0;
  let videosPending = 0;

  for (const unit of master.units || []) {
    for (const lesson of unit.lessons || []) {
      totalLessons++;
      if (['extracted', 'reviewed', 'video_generated'].includes(lesson.status)) {
        extractedLessons++;
      }
      if (lesson.video_status === 'generated') {
        videosGenerated++;
      } else if (lesson.video_status !== 'generated' && lesson.video_status !== 'not_generated') {
        videosPending++;
      } else if (lesson.video_status === 'not_generated' && ['extracted', 'reviewed'].includes(lesson.status)) {
        videosPending++;
      }
    }
  }

  master.stats = {
    total_units: master.units?.length || 0,
    total_lessons: totalLessons,
    extracted_lessons: extractedLessons,
    videos_generated: videosGenerated,
    videos_pending: videosPending,
  };

  saveBook(bookId, master);
  return master;
}

/**
 * Generate a book ID from title
 * @param {string} title
 * @returns {string}
 */
function generateBookId(title) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 30);
  const hash = crypto.randomBytes(4).toString('hex');
  return `${slug}-${hash}`;
}

/**
 * Check if book exists
 * @param {string} bookId
 * @returns {boolean}
 */
function bookExists(bookId) {
  ensureDirs();
  const masterPath = path.join(BOOKS_DIR, bookId, 'master.json');
  return fs.existsSync(masterPath);
}

module.exports = {
  listBooks,
  getBook,
  createBook,
  saveBook,
  deleteBook,
  updateExtractionStatus,
  updateStats,
  generateBookId,
  bookExists,
  BOOKS_DIR,
};
