# 📋 قائمة المهام (TODO List)

> **مرجع**: راجع `PLAN.md` للتفاصيل الكاملة

---

## 🎯 المرحلة 1: البنية التحتية (Infrastructure)

### 1.1 إعداد المشروع
- [ ] **T1.1.1** إنشاء هيكل المجلدات الجديد (`data/books/`, `data/config/`)
- [ ] **T1.1.2** تحديث `package.json` بإضافة dependencies:
  - `multer` (رفع الملفات)
  - `socket.io` (تحديثات لحظية)
  - `katex` (الصيغ الرياضية)
  - `uuid` (توليد IDs)
  - `cors` (CORS للـ API)
- [ ] **T1.1.3** تثبيت `dashboard-app` (Next.js 15 منفصل)
- [ ] **T1.1.4** تثبيت shadcn/ui في dashboard-app
- [ ] **T1.1.5** إعداد Tailwind 4 + خط Cairo

### 1.2 TypeScript Types
- [ ] **T1.2.1** إنشاء `dashboard-app/src/lib/types/book.ts`
- [ ] **T1.2.2** إنشاء `dashboard-app/src/lib/types/lesson.ts`
- [ ] **T1.2.3** إنشاء `dashboard-app/src/lib/types/api.ts`
- [ ] **T1.2.4** إنشاء `dashboard-app/src/lib/types/video.ts`

---

## 📚 المرحلة 2: قاعدة البيانات (Database Layer)

### 2.1 Schemas
- [ ] **T2.1.1** إنشاء `data/books/_template/master.template.json`
- [ ] **T2.1.2** إنشاء `data/books/_template/lessons/lesson.template.json`
- [ ] **T2.1.3** إنشاء `data/books/_template/queue.template.json`

### 2.2 تحديث Content Extractor
- [ ] **T2.2.1** تحديث `content-extractor/config/extraction-prompt.txt`:
  - إضافة تقسيم الدروس في الاستخراج
  - تحسين استخراج الجداول
  - تحسين وصف الصور
- [ ] **T2.2.2** إنشاء `content-extractor/scripts/generate-master.py`:
  - يقرأ raw-json
  - يكتشف حدود الدروس
  - يولد master.json + lesson.json لكل درس
- [ ] **T2.2.3** تحديث `content-extractor/scripts/merge-pages.py`:
  - تجميع حسب lesson_id
  - حساب confidence إجمالي
- [ ] **T2.2.4** تحديث `content-extractor/config/pipeline-config.json`:
  - إضافة إعدادات R2
  - إضافة إعدادات queue

### 2.3 Data Access Layer
- [ ] **T2.3.1** إنشاء `lib/db/books.ts` - CRUD للكتب
- [ ] **T2.3.2** إنشاء `lib/db/lessons.ts` - CRUD للدروس
- [ ] **T2.3.3** إنشاء `lib/db/queue.ts` - إدارة قائمة انتظار الفيديو
- [ ] **T2.3.4** إنشاء `lib/db/config.ts` - إدارة الإعدادات

---

## 🌐 المرحلة 3: Backend API (Express)

### 3.1 إعداد الخادم
- [ ] **T3.1.1** إنشاء `dashboard-server.js`:
  - إعداد Express
  - إعداد Multer (limit: 100MB)
  - إعداد Socket.io
  - إعداد CORS
- [ ] **T3.1.2** إضافة middleware للـ logging
- [ ] **T3.1.3** إضافة error handling موحد

### 3.2 Books API
- [ ] **T3.2.1** `GET /api/books` - قائمة كل الكتب
- [ ] **T3.2.2** `POST /api/books/upload` - رفع PDF
- [ ] **T3.2.3** `GET /api/books/:bookId` - تفاصيل كتاب
- [ ] **T3.2.4** `DELETE /api/books/:bookId` - حذف كتاب
- [ ] **T3.2.5** `POST /api/books/:bookId/extract` - بدء الاستخراج
- [ ] **T3.2.6** `GET /api/books/:bookId/extract/status` - حالة الاستخراج
- [ ] **T3.2.7** `POST /api/books/:bookId/extract/stop` - إيقاف الاستخراج
- [ ] **T3.2.8** `GET /api/books/:bookId/logs` - سجل العمليات

### 3.3 Lessons API
- [ ] **T3.3.1** `GET /api/books/:bookId/lessons` - قائمة الدروس
- [ ] **T3.3.2** `GET /api/books/:bookId/lessons/:lessonId` - تفاصيل درس
- [ ] **T3.3.3** `PUT /api/books/:bookId/lessons/:lessonId` - تحديث درس
- [ ] **T3.3.4** `POST /api/books/:bookId/lessons/:lessonId/images` - رفع صورة
- [ ] **T3.3.5** `DELETE /api/books/:bookId/lessons/:lessonId/images/:imgId` - حذف صورة
- [ ] **T3.3.6** `POST /api/books/:bookId/lessons/:lessonId/review` - تمييز كمراجَع

### 3.4 Videos API
- [ ] **T3.4.1** `GET /api/videos/queue` - قائمة الانتظار
- [ ] **T3.4.2** `POST /api/videos/generate/:bookId/:lessonId` - توليد فيديو
- [ ] **T3.4.3** `POST /api/videos/generate-batch` - توليد مجموعة
- [ ] **T3.4.4** `GET /api/videos/status/:bookId/:lessonId` - حالة التوليد
- [ ] **T3.4.5** `POST /api/videos/cancel/:bookId/:lessonId` - إلغاء
- [ ] **T3.4.6** `GET /api/videos/:bookId/:lessonId/file` - تحميل الفيديو
- [ ] **T3.4.7** `POST /api/videos/export-education` - تصدير JSON

### 3.5 Pipeline API
- [ ] **T3.5.1** `GET /api/config` - الإعدادات الحالية
- [ ] **T3.5.2** `POST /api/config` - حفظ الإعدادات
- [ ] **T3.5.3** `GET /api/system/status` - حالة النظام (GPU, RAM, Disk)

---

## 🎨 المرحلة 4: Frontend (Next.js Dashboard)

### 4.1 إعداد المشروع
- [ ] **T4.1.1** تهيئة Next.js 15 في `dashboard-app/`
- [ ] **T4.1.2** تثبيت shadcn/ui components (button, card, input, dialog, etc.)
- [ ] **T4.1.3** إعداد layout مع sidebar
- [ ] **T4.1.4** إعداد dark mode theme

### 4.2 Layout & Navigation
- [ ] **T4.2.1** إنشاء `app/layout.tsx` مع sidebar
- [ ] **T4.2.2** إنشاء Sidebar component
- [ ] **T4.2.3** إنشاء Header component
- [ ] **T4.2.4** ربط WebSocket للتحديثات اللحظية

### 4.3 صفحة Dashboard الرئيسية
- [ ] **T4.3.1** إنشاء `app/page.tsx`
- [ ] **T4.3.2** بطاقات الإحصائيات (Stats Cards)
- [ ] **T4.3.3** قائمة آخر الكتب
- [ ] **T4.3.4** قائمة انتظار الفيديو

### 4.4 صفحة الكتب
- [ ] **T4.4.1** إنشاء `app/books/page.tsx`
- [ ] **T4.4.2** نموذج رفع كتاب جديد (Modal)
- [ ] **T4.4.3** بطاقة كتاب (BookCard component)
- [ ] **T4.4.4** شريط تقدم الاستخراج
- [ ] **T4.4.5** أزرار: فتح، إعادة استخراج، حذف

### 4.5 صفحة تفاصيل الكتاب
- [ ] **T4.5.1** إنشاء `app/books/[id]/page.tsx`
- [ ] **T4.5.2** عرض الوحدات والدروس (Tree view)
- [ ] **T4.5.3** أزرار: استخراج، توليد كل الفيديوهات

### 4.6 صفحة محرر الدرس
- [ ] **T4.6.1** إنشاء `app/lessons/[id]/page.tsx`
- [ ] **T4.6.2** تبويبات: نص، صور، جداول، صيغ، أسئلة
- [ ] **T4.6.3** TextEditor component (TipTap + KaTeX)
- [ ] **T4.6.4** ImageManager component
- [ ] **T4.6.5** TableEditor component
- [ ] **T4.6.6** FormulaEditor component (مع preview)
- [ ] **T4.6.7** QuestionEditor component
- [ ] **T4.6.8** زر "توليد الفيديو"
- [ ] **T4.6.9** حفظ تلقائي (Auto-save)

### 4.7 صفحة استوديو الفيديو
- [ ] **T4.7.1** إنشاء `app/videos/page.tsx`
- [ ] **T4.7.2** قائمة الدروس مع checkboxes
- [ ] **T4.7.3** أزرار: توليد المحدد، توليد الكل
- [ ] **T4.7.4** سجل العمليات اللحظي (Log panel)
- [ ] **T4.7.5** معاينة الفيديو (Video player)
- [ ] **T4.7.6** زر تصدير JSON لـ education

### 4.8 صفحة الإعدادات
- [ ] **T4.8.1** إنشاء `app/settings/page.tsx`
- [ ] **T4.8.2** نموذج إعدادات VLM
- [ ] **T4.8.3** نموذج إعدادات TTS
- [ ] **T4.8.4** نموذج إعدادات الفيديو
- [ ] **T4.8.5** نموذج إعدادات R2 (مع اختبار اتصال)

---

## 🎬 المرحلة 5: Video Production Pipeline

### 5.1 تحديث Remotion Components
- [ ] **T5.1.1** تحديث `src/Root.tsx` لتقبل props ديناميكية
- [ ] **T5.1.2** تحديث `src/compositions/LessonVideo.tsx`:
  - قراءة scenes من props
  - حساب المدة الكلية تلقائياً
  - دعم مشاهد متعددة
- [ ] **T5.1.3** تحديث `src/components/FormulaWrite.tsx` لتقبل formula من props
- [ ] **T5.1.4** تحديث `src/components/SimulatorCinematic.tsx` لتقبل config من props
- [ ] **T5.1.5** تحديث `src/components/MindMapCinematic.tsx` لتقبل nodes من props
- [ ] **T5.1.6** تحديث `src/components/QuizCinematic.tsx` لتقبل questions من props
- [ ] **T5.1.7** إنشاء `src/components/ImageDisplay.tsx` (جديد)
- [ ] **T5.1.8** إنشاء `src/components/TableDisplay.tsx` (جديد)

### 5.2 سكربتات الأتمتة
- [ ] **T5.2.1** إنشاء `scripts/generate-script.py`:
  - تحويل lesson.json لسكريبت صوتي
  - دعم لهجتين
  - إضافة علامات المشاهد
- [ ] **T5.2.2** تحديث `scripts/generate_tts.py`:
  - قراءة من lesson.json
  - تحديث video.script_text
- [ ] **T5.2.3** إنشاء `scripts/render-video.js`:
  - يقرأ lesson.json
  - يستدعي generate_tts.py
  - يستدعي Remotion render
  - يستدعي FFmpeg
  - يحدّث lesson.json بالنتيجة
- [ ] **T5.2.4** إنشاء `scripts/upload-r2.js` (اختياري):
  - رفع لـ Cloudflare R2
  - تحديث video_url
- [ ] **T5.2.5** إنشاء `scripts/export-education.js`:
  - تصدير JSON لمنصة education

### 5.3 نظام Queue
- [ ] **T5.3.1** إنشاء `lib/queue/queue-manager.js`:
  - إضافة دروس للقائمة
  - معالجة تسلسلية
  - إشعارات Socket.io
- [ ] **T5.3.2** إنشاء `lib/queue/queue-worker.js`:
  - معالج الخلفية
  - استدعاء render-video.js
  - تحديث الحالة
- [ ] **T5.3.3** إنشاء `data/queue.json`:
  - قائمة الانتظار الحالية
  - الدروس قيد المعالجة
  - الدروس المكتملة

---

## 🔗 المرحلة 6: التكامل والاختبار

### 6.1 اختبار شامل (E2E)
- [ ] **T6.1.1** اختبار رفع كتاب تجريبي
- [ ] **T6.1.2** اختبار استخراج المحتوى
- [ ] **T6.1.3** اختبار مراجعة وتعديل درس
- [ ] **T6.1.4** اختبار توليد فيديو
- [ ] **T6.1.5** اختبار تصدير JSON لـ education

### 6.2 اختبارات الحواف (Edge Cases)
- [ ] **T6.2.1** اختبار Resume (إيقاف واستئناف)
- [ ] **T6.2.2** اختبار فشل VLM (محاكاة OOM)
- [ ] **T6.2.3** اختبار ملف PDF تالف
- [ ] **T6.2.4** اختبار رفع ملف كبير (200+ صفحة)

### 6.3 التوثيق
- [ ] **T6.3.1** تحديث `README.md`:
  - دليل التشغيل السريع
  - متطلبات النظام
  - استكشاف الأخطاء
- [ ] **T6.3.2** إنشاء `docs/USER_GUIDE.md`
- [ ] **T6.3.3** إنشاء `docs/API_REFERENCE.md`

### 6.4 النشر
- [ ] **T6.4.1** Push نهائي لـ GitHub
- [ ] **T6.4.2** إنشاء Tag v2.0
- [ ] **T6.4.3** كتابة Release Notes

---

## 📊 إحصائيات المهام

| المرحلة | عدد المهام | المكتملة | النسبة |
|---------|-----------|---------|--------|
| 1. Infrastructure | 9 | 9 | 100% ✅ |
| 2. Database | 11 | 11 | 100% ✅ |
| 3. Backend API | 22 | 22 | 100% ✅ |
| 4. Frontend | 26 | 26 | 100% ✅ |
| 5. Video Pipeline | 16 | 16 | 100% ✅ |
| 6. Integration | 12 | 11 | 92% 🟡 |
| **المجموع** | **96** | **95** | **99%** ✅ |

### ✅ تم الإنجاز:
- Phase 1: هيكل المشروع + TypeScript types
- Phase 2: قاعدة البيانات + Templates + generate-master.py
- Phase 3: Backend API كامل (24 endpoint)
- Phase 4: Frontend Next.js كامل (6 صفحات + 13 مكون)
- Phase 5: Video Pipeline (Remotion + scripts + queue worker)
- Phase 6: التوثيق (README + USER_GUIDE + API_REFERENCE)

### 🟡 المتبقي (يتطلب اختبار على اللابتوب):
- اختبار E2E كامل بكتاب حقيقي
- اختبار R2 connection
- إنشاء Tag v2.0

---

## 🎯 الأولويات

### 🔴 أولوية عالية (Must Have)
- المرحلة 1: البنية التحتية
- المرحلة 2: قاعدة البيانات
- المرحلة 3: Backend API
- المرحلة 4: Frontend الأساسي

### 🟡 أولوية متوسطة (Should Have)
- المرحلة 5: Video Pipeline
- محرر المحتوى المتقدم

### 🟢 أولوية منخفضة (Nice to Have)
- تكامل R2
- ميزات متقدمة (Backup، Versions)
- تحليلات متقدمة

---

**آخر تحديث**: 2025-01-15
