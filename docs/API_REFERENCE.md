# 🔌 API Reference - Smart Video Factory

> توثيق كامل لجميع endpoints الـ Backend API

**Base URL**: `http://localhost:3001/api`

---

## 📚 Books API

### List All Books

```http
GET /api/books
```

**Response**:
```json
[
  {
    "id": "physics-3rd-secondary",
    "title": "الفيزياء للصف الثالث الثانوي",
    "subject": "physics",
    "grade": "3rd-secondary",
    "publisher": "المعاصر",
    "total_pages": 200,
    "extraction_status": "completed",
    "extraction_progress": 100,
    "total_lessons": 32,
    "videos_generated": 12,
    "created_at": "2025-01-15T10:00:00Z"
  }
]
```

---

### Upload Book

```http
POST /api/books/upload
Content-Type: multipart/form-data
```

**Form Data**:
- `pdf` (file): ملف PDF
- `title` (string): عنوان الكتاب
- `subject` (string): المادة
- `grade` (string): الصف
- `publisher` (string, optional): الناشر

**Response**:
```json
{
  "success": true,
  "data": {
    "book": {
      "id": "physics-3rd-secondary-abc123",
      "title": "...",
      "subject": "physics",
      "total_pages": 200,
      "extraction_status": "pending"
    }
  }
}
```

---

### Get Book Details

```http
GET /api/books/:bookId
```

**Response**: Full master.json object

---

### Delete Book

```http
DELETE /api/books/:bookId
```

**Response**:
```json
{ "success": true, "message": "Book deleted" }
```

---

### Start Extraction

```http
POST /api/books/:bookId/extract
```

**Response**:
```json
{
  "success": true,
  "message": "Extraction started",
  "estimated_time_minutes": 180
}
```

---

### Get Extraction Status

```http
GET /api/books/:bookId/extract/status
```

**Response**:
```json
{
  "book_id": "physics-3rd-secondary",
  "status": "extracting",
  "progress": 45,
  "current_page": 90,
  "total_pages": 200,
  "pages_extracted": 90,
  "pages_failed": 2,
  "started_at": "2025-01-15T10:00:00Z",
  "estimated_completion": "2025-01-15T13:00:00Z"
}
```

---

### Stop Extraction

```http
POST /api/books/:bookId/extract/stop
```

---

### Get Logs

```http
GET /api/books/:bookId/logs
```

**Response**: Plain text log content

---

## 📝 Lessons API

### List Lessons

```http
GET /api/books/:bookId/lessons
```

**Response**:
```json
[
  {
    "id": "lesson-1-1",
    "title": "قانون أوم",
    "page_start": 45,
    "page_end": 52,
    "status": "extracted",
    "video_status": "generated",
    "unit_id": "unit-1",
    "unit_title": "الفيزياء الكهربية"
  }
]
```

---

### Get Lesson

```http
GET /api/books/:bookId/lessons/:lessonId
```

**Response**: Full lesson.json object

---

### Update Lesson

```http
PUT /api/books/:bookId/lessons/:lessonId
Content-Type: application/json
```

**Body**: Full lesson object

**Response**:
```json
{ "success": true, "message": "Lesson saved" }
```

---

### Upload Image

```http
POST /api/books/:bookId/lessons/:lessonId/images
Content-Type: multipart/form-data
```

**Form Data**:
- `image` (file): ملف الصورة
- `description` (string, optional): وصف
- `type` (string, optional): circuit | graph | diagram | photo

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "img-abc123",
    "path": "images/lesson-1-1/img-abc123.png",
    "description": "..."
  }
}
```

---

### Delete Image

```http
DELETE /api/books/:bookId/lessons/:lessonId/images/:imageId
```

---

### Mark as Reviewed

```http
POST /api/books/:bookId/lessons/:lessonId/review
Content-Type: application/json
```

**Body**:
```json
{ "notes": "تمت المراجعة، الدرس جاهز" }
```

---

## 🎬 Videos API

### Get Queue

```http
GET /api/videos/queue
```

**Response**:
```json
{
  "active_jobs": [...],
  "pending_queue": [...],
  "completed": [...],
  "failed": [...],
  "last_updated": "..."
}
```

---

### Generate Video

```http
POST /api/videos/generate/:bookId/:lessonId
```

**Response**:
```json
{
  "success": true,
  "message": "Added to queue",
  "estimated_duration_sec": 300
}
```

---

### Generate Batch

```http
POST /api/videos/generate-batch
Content-Type: application/json
```

**Body**:
```json
{
  "book_id": "physics-3rd-secondary",
  "lesson_ids": ["lesson-1-1", "lesson-1-2", "lesson-1-3"]
}
```

---

### Get Video Status

```http
GET /api/videos/status/:bookId/:lessonId
```

**Response**:
```json
{
  "book_id": "...",
  "lesson_id": "...",
  "status": "generating",
  "progress": 65,
  "current_step": "Rendering video",
  "started_at": "...",
  "video_url": null
}
```

---

### Cancel Generation

```http
POST /api/videos/cancel/:bookId/:lessonId
```

---

### Download Video

```http
GET /api/videos/:bookId/:lessonId/file
```

**Response**: MP4 file stream (with Range support)

---

### Export for Education

```http
POST /api/videos/export-education
Content-Type: application/json
```

**Body**:
```json
{
  "book_id": "physics-3rd-secondary",
  "lesson_ids": ["lesson-1-1", "lesson-1-2"]  // optional, if omitted exports all
}
```

**Response**:
```json
{
  "success": true,
  "exported_lessons": 32,
  "export_path": "data/books/physics-3rd-secondary/education-export.json"
}
```

---

## ⚙️ Pipeline API

### Get Config

```http
GET /api/config
```

**Response**: Full pipeline-config.json object

---

### Save Config

```http
POST /api/config
Content-Type: application/json
```

**Body**: Partial config object (will be merged)

---

### Get System Status

```http
GET /api/system/status
```

**Response**:
```json
{
  "cpu_percent": 45.2,
  "memory": {
    "total": 16384,
    "used": 8192,
    "free": 8192,
    "percent": 50
  },
  "disk": {
    "total": 512000,
    "used": 256000,
    "free": 256000,
    "percent": 50
  },
  "gpu": {
    "name": "NVIDIA RTX 3060",
    "vram_total": 8192,
    "vram_used": 4096,
    "vram_free": 4096,
    "utilization": 75
  },
  "uptime_sec": 3600
}
```

---

## 🔌 Socket.io Events

The server emits real-time events via Socket.io:

### `extraction-progress`
```json
{
  "book_id": "...",
  "progress": 45,
  "current_page": 90,
  "total_pages": 200
}
```

### `video-progress`
```json
{
  "book_id": "...",
  "lesson_id": "...",
  "step": "rendering",
  "progress": 65,
  "message": "Rendering frame 1500/2250"
}
```

### `queue-update`
```json
{
  "active_jobs": 1,
  "pending_queue": 5,
  "completed_today": 12
}
```

### `log`
```json
{
  "timestamp": "...",
  "level": "info",
  "message": "..."
}
```

---

## ❌ Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request |
| 404 | Not Found |
| 500 | Server Error |

---

## 📊 Rate Limits

- No rate limits (local development)
- File upload limit: 100MB

---

**Last Updated**: January 2025
