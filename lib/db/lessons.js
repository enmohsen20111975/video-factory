/**
 * Lessons Database Access Layer
 * Manages individual lesson.json files
 * @module lib/db/lessons
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { BOOKS_DIR } = require('./books');

/**
 * Get all lessons for a book (summaries from master.json)
 * @param {string} bookId
 * @returns {Array|null}
 */
function listLessons(bookId) {
  const masterPath = path.join(BOOKS_DIR, bookId, 'master.json');
  if (!fs.existsSync(masterPath)) return null;

  const master = JSON.parse(fs.readFileSync(masterPath, 'utf-8'));
  const lessons = [];
  for (const unit of master.units || []) {
    for (const lesson of unit.lessons || []) {
      lessons.push({ ...lesson, unit_title: unit.title, unit_id: unit.id });
    }
  }
  return lessons;
}

/**
 * Get full lesson data
 * @param {string} bookId
 * @param {string} lessonId
 * @returns {object|null}
 */
function getLesson(bookId, lessonId) {
  const lessonPath = path.join(BOOKS_DIR, bookId, 'lessons', `${lessonId}.json`);
  if (!fs.existsSync(lessonPath)) return null;
  return JSON.parse(fs.readFileSync(lessonPath, 'utf-8'));
}

/**
 * Save lesson data
 * @param {string} bookId
 * @param {string} lessonId
 * @param {object} lesson
 */
function saveLesson(bookId, lessonId, lesson) {
  const lessonDir = path.join(BOOKS_DIR, bookId, 'lessons');
  if (!fs.existsSync(lessonDir)) {
    fs.mkdirSync(lessonDir, { recursive: true });
  }
  lesson.metadata.updated_at = new Date().toISOString();
  const lessonPath = path.join(lessonDir, `${lessonId}.json`);
  fs.writeFileSync(lessonPath, JSON.stringify(lesson, null, 2), 'utf-8');

  // Update master.json lesson summary
  updateLessonSummary(bookId, lessonId, lesson);
}

/**
 * Update lesson summary in master.json
 * @param {string} bookId
 * @param {string} lessonId
 * @param {object} lesson
 */
function updateLessonSummary(bookId, lessonId, lesson) {
  const { getBook, saveBook } = require('./books');
  const master = getBook(bookId);
  if (!master) return;

  let found = false;
  for (const unit of master.units || []) {
    for (const l of unit.lessons || []) {
      if (l.id === lessonId) {
        l.title = lesson.metadata.title;
        l.status = lesson.video?.status === 'generated' ? 'video_generated' :
                   lesson.video?.status === 'generating' ? 'video_generating' :
                   lesson.extraction_meta?.needs_review === false ? 'reviewed' : 'extracted';
        l.video_status = lesson.video?.status || 'not_generated';
        found = true;
        break;
      }
    }
    if (found) break;
  }

  if (found) {
    saveBook(bookId, master);
  }
}

/**
 * Update lesson video status
 * @param {string} bookId
 * @param {string} lessonId
 * @param {object} videoUpdate - { status, video_url, duration_sec, file_size_mb, render_log }
 */
function updateVideoStatus(bookId, lessonId, videoUpdate) {
  const lesson = getLesson(bookId, lessonId);
  if (!lesson) return null;

  lesson.video = { ...lesson.video, ...videoUpdate };
  if (videoUpdate.status === 'generated') {
    lesson.video.rendered_at = new Date().toISOString();
  }
  saveLesson(bookId, lessonId, lesson);
  return lesson;
}

/**
 * Mark lesson as reviewed
 * @param {string} bookId
 * @param {string} lessonId
 * @param {string} notes
 */
function markAsReviewed(bookId, lessonId, notes = '') {
  const lesson = getLesson(bookId, lessonId);
  if (!lesson) return null;

  lesson.extraction_meta.needs_review = false;
  lesson.extraction_meta.review_notes = notes;
  saveLesson(bookId, lessonId, lesson);
  return lesson;
}

/**
 * Add image to lesson
 * @param {string} bookId
 * @param {string} lessonId
 * @param {object} imageData - { source_page, path, description, type, width, height }
 */
function addImage(bookId, lessonId, imageData) {
  const lesson = getLesson(bookId, lessonId);
  if (!lesson) return null;

  const image = {
    id: `img-${crypto.randomBytes(4).toString('hex')}`,
    ...imageData,
  };
  lesson.images.push(image);
  saveLesson(bookId, lessonId, lesson);
  return image;
}

/**
 * Delete image from lesson
 * @param {string} bookId
 * @param {string} lessonId
 * @param {string} imageId
 */
function deleteImage(bookId, lessonId, imageId) {
  const lesson = getLesson(bookId, lessonId);
  if (!lesson) return false;

  const idx = lesson.images.findIndex((img) => img.id === imageId);
  if (idx === -1) return false;

  const image = lesson.images[idx];
  // Delete file
  const fullPath = path.join(BOOKS_DIR, bookId, image.path);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }

  lesson.images.splice(idx, 1);
  saveLesson(bookId, lessonId, lesson);
  return true;
}

/**
 * Create a new lesson
 * @param {string} bookId
 * @param {string} unitId
 * @param {object} lessonData
 */
function createLesson(bookId, unitId, lessonData) {
  const { getBook, saveBook } = require('./books');
  const master = getBook(bookId);
  if (!master) return null;

  const lessonId = lessonData.id || `lesson-${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();

  // Create lesson file
  const lesson = {
    metadata: {
      book_id: bookId,
      unit_id: unitId,
      lesson_id: lessonId,
      title: lessonData.title || 'درس جديد',
      subtitle: lessonData.subtitle || '',
      page_start: lessonData.page_start || 0,
      page_end: lessonData.page_end || 0,
      subject: master.book.subject,
      grade: master.book.grade,
      duration_minutes: 8,
      difficulty: 'medium',
      created_at: now,
      updated_at: now,
    },
    content: {
      raw_text: '',
      summary: '',
      objectives: [],
      definitions: [],
      formulas: [],
      explanations: [],
    },
    images: [],
    tables: [],
    questions: [],
    scenes: [
      { type: 'intro', duration_sec: 4, title: 'المقدمة' },
      { type: 'title', duration_sec: 8, title: 'عنوان الدرس' },
      { type: 'outro', duration_sec: 5 },
    ],
    video: {
      status: 'not_generated',
      script_text: '',
      voice: 'ar-EG-SalmaNeural',
      video_url: null,
      thumbnail_url: null,
      duration_sec: 75,
      rendered_at: null,
      render_log: null,
      file_size_mb: null,
    },
    extraction_meta: {
      extracted_at: now,
      model: 'manual',
      confidence: 1.0,
      needs_review: false,
      review_notes: '',
    },
  };

  saveLesson(bookId, lessonId, lesson);

  // Add to master.json
  const unit = master.units?.find((u) => u.id === unitId);
  if (unit) {
    unit.lessons.push({
      id: lessonId,
      title: lesson.metadata.title,
      page_start: lesson.metadata.page_start,
      page_end: lesson.metadata.page_end,
      status: 'extracted',
      lesson_file: `lessons/${lessonId}.json`,
      video_status: 'not_generated',
    });
    saveBook(bookId, master);
  }

  return lesson;
}

module.exports = {
  listLessons,
  getLesson,
  saveLesson,
  updateVideoStatus,
  markAsReviewed,
  addImage,
  deleteImage,
  createLesson,
  updateLessonSummary,
};
