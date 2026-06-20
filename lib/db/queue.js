/**
 * Queue Database Access Layer
 * Manages video generation queue
 * @module lib/db/queue
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const QUEUE_FILE = path.join(DATA_DIR, 'queue.json');

function ensureQueueFile() {
  if (!fs.existsSync(QUEUE_FILE)) {
    const empty = {
      active_jobs: [],
      pending_queue: [],
      completed: [],
      failed: [],
      last_updated: new Date().toISOString(),
    };
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(empty, null, 2), 'utf-8');
  }
}

function getQueue() {
  ensureQueueFile();
  return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
}

function saveQueue(queue) {
  queue.last_updated = new Date().toISOString();
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf-8');
}

/**
 * Add lesson to queue
 * @param {string} bookId
 * @param {string} lessonId
 * @param {string} lessonTitle
 */
function addToQueue(bookId, lessonId, lessonTitle) {
  const queue = getQueue();

  // Check if already in queue
  const exists = [...queue.active_jobs, ...queue.pending_queue].some(
    (item) => item.book_id === bookId && item.lesson_id === lessonId
  );
  if (exists) return false;

  queue.pending_queue.push({
    book_id: bookId,
    lesson_id: lessonId,
    lesson_title: lessonTitle,
    status: 'pending',
    added_at: new Date().toISOString(),
  });

  saveQueue(queue);
  return true;
}

/**
 * Get next item from queue
 * @returns {object|null}
 */
function getNext() {
  const queue = getQueue();
  if (queue.pending_queue.length === 0) return null;

  const item = queue.pending_queue.shift();
  item.status = 'processing';
  item.started_at = new Date().toISOString();
  queue.active_jobs.push(item);
  saveQueue(queue);
  return item;
}

/**
 * Mark job as completed
 * @param {string} bookId
 * @param {string} lessonId
 * @param {string} videoUrl
 * @param {number} fileSizeMb
 */
function markCompleted(bookId, lessonId, videoUrl, fileSizeMb) {
  const queue = getQueue();
  const idx = queue.active_jobs.findIndex(
    (item) => item.book_id === bookId && item.lesson_id === lessonId
  );
  if (idx === -1) return false;

  const item = queue.active_jobs.splice(idx, 1)[0];
  item.status = 'completed';
  item.completed_at = new Date().toISOString();
  item.video_url = videoUrl;
  item.file_size_mb = fileSizeMb;
  queue.completed.unshift(item);

  // Keep only last 50 completed
  if (queue.completed.length > 50) {
    queue.completed = queue.completed.slice(0, 50);
  }

  saveQueue(queue);
  return true;
}

/**
 * Mark job as failed
 * @param {string} bookId
 * @param {string} lessonId
 * @param {string} error
 */
function markFailed(bookId, lessonId, error) {
  const queue = getQueue();
  const idx = queue.active_jobs.findIndex(
    (item) => item.book_id === bookId && item.lesson_id === lessonId
  );
  if (idx === -1) return false;

  const item = queue.active_jobs.splice(idx, 1)[0];
  item.status = 'failed';
  item.completed_at = new Date().toISOString();
  item.error = error;
  queue.failed.unshift(item);

  if (queue.failed.length > 50) {
    queue.failed = queue.failed.slice(0, 50);
  }

  saveQueue(queue);
  return true;
}

/**
 * Cancel a job
 * @param {string} bookId
 * @param {string} lessonId
 */
function cancelJob(bookId, lessonId) {
  const queue = getQueue();

  // Remove from pending
  const pendingIdx = queue.pending_queue.findIndex(
    (item) => item.book_id === bookId && item.lesson_id === lessonId
  );
  if (pendingIdx !== -1) {
    queue.pending_queue.splice(pendingIdx, 1);
    saveQueue(queue);
    return true;
  }

  // Mark active as cancelled (will be picked up by worker)
  const activeJob = queue.active_jobs.find(
    (item) => item.book_id === bookId && item.lesson_id === lessonId
  );
  if (activeJob) {
    activeJob.status = 'cancelled';
    saveQueue(queue);
    return true;
  }

  return false;
}

/**
 * Clear completed/failed history
 */
function clearHistory() {
  const queue = getQueue();
  queue.completed = [];
  queue.failed = [];
  saveQueue(queue);
}

module.exports = {
  getQueue,
  addToQueue,
  getNext,
  markCompleted,
  markFailed,
  cancelJob,
  clearHistory,
};
