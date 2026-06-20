# ✅ قائمة التحقق (Checklist)

> **الهدف**: التحقق من اكتمال كل مرحلة قبل الانتقال للتالية
> **كيفية الاستخدام**: ضع علامة ✅ أمام كل عنصر بعد التحقق منه

---

## 🔍 Pre-Flight Check (قبل البدء)

### بيئة العمل
- [ ] Node.js 18+ مثبت
- [ ] Python 3.10+ مثبت
- [ ] Ollama مثبت ويعمل
- [ ] FFmpeg مثبت
- [ ] Chrome/Chromium مثبت (لـ Remotion)

### نماذج Ollama
- [ ] `qwen2-vl:7b` منزّل
- [ ] `gemma3:4b` منزّل (fallback)
- [ ] `qwen2-vl:2b` منزّل (fallback)

### Python Packages
- [ ] `edge-tts` مثبت
- [ ] `ollama` مثبت
- [ ] `pdf2pic` مثبت (أو `pymupdf`)
- [ ] `psutil` مثبت

### Repo
- [ ] Clone من GitHub
- [ ] `npm install` تم
- [ ] `pip install -r content-extractor/requirements.txt` تم

---

## 📦 Phase 1: Infrastructure Checklist

### 1.1 هيكل المجلدات
- [ ] `data/books/` موجود
- [ ] `data/books/_template/` موجود
- [ ] `data/config/` موجود
- [ ] `dashboard-app/` موجود
- [ ] `scripts/` محدث

### 1.2 package.json
- [ ] `multer` مضاف
- [ ] `socket.io` مضاف
- [ ] `cors` مضاف
- [ ] `uuid` مضاف
- [ ] scripts جديدة موجودة:
  - [ ] `"dashboard": "node dashboard-server.js"`
  - [ ] `"dashboard:dev": "cd dashboard-app && npm run dev"`
  - [ ] `"extract": "python content-extractor/run-all.py"`
  - [ ] `"render": "node scripts/render-video.js"`

### 1.3 TypeScript Types
- [ ] `types/book.ts` يعرّف Book, Unit, LessonSummary
- [ ] `types/lesson.ts` يعرّف Lesson, Content, Image, Table, Formula, Question
- [ ] `types/api.ts` يعرّف ApiResponse, ApiError
- [ ] `types/video.ts` يعرّف VideoStatus, VideoConfig

---

## 📚 Phase 2: Database Checklist

### 2.1 Templates
- [ ] `master.template.json` يحتوي:
  - [ ] book metadata
  - [ ] units array
  - [ ] lessons array
  - [ ] stats object
- [ ] `lesson.template.json` يحتوي:
  - [ ] metadata
  - [ ] content (raw_text, summary, definitions, formulas, explanations)
  - [ ] images array
  - [ ] tables array
  - [ ] questions array
  - [ ] scenes array
  - [ ] video object
  - [ ] extraction_meta

### 2.2 Extraction Prompt
- [ ] البرومبت يطلب:
  - [ ] `page_type` (lesson/exercise/example/summary)
  - [ ] `lesson_id` مقترح
  - [ ] `unit_id` مقترح
  - [ ] `definitions` مع IDs
  - [ ] `formulas` بصيغة LaTeX
  - [ ] `examples` مع خطوات الحل
  - [ ] `exercises` مع أنواعها
  - [ ] `tables` مع headers و rows
  - [ ] `figures` مع وصف وأ نوع
  - [ ] `key_points`
  - [ ] `raw_text` كامل
  - [ ] `confidence` score

### 2.3 generate-master.py
- [ ] يقرأ من `raw-json/`
- [ ] يجمع الصفحات حسب lesson_id
- [ ] يولد `master.json`
- [ ] يولد `lessons/{lesson-id}.json` لكل درس
- [ ] ينسخ الصور لـ `images/{lesson-id}/`
- [ ] يحسب stats (عدد الدروس، إلخ)

---

## 🌐 Phase 3: Backend API Checklist

### 3.1 Server Setup
- [ ] Express يعمل على port 3001
- [ ] CORS مفعّل
- [ ] Multer مفعّل (limit 100MB)
- [ ] Socket.io مفعّل
- [ ] Static files تُخدم من `data/`
- [ ] Logging middleware يعمل
- [ ] Error handler يعمل

### 3.2 Books API Tests
- [ ] `GET /api/books` يعيد قائمة الكتب
- [ ] `POST /api/books/upload` يحفظ PDF
- [ ] `POST /api/books/upload` يرفض غير PDF
- [ ] `GET /api/books/:id` يعيد master.json
- [ ] `DELETE /api/books/:id` يحذف الكتاب
- [ ] `POST /api/books/:id/extract` يبدأ الاستخراج
- [ ] `GET /api/books/:id/extract/status` يعيد التقدم

### 3.3 Lessons API Tests
- [ ] `GET /api/books/:id/lessons` يعيد القائمة
- [ ] `GET /api/books/:id/lessons/:lid` يعيد الدرس
- [ ] `PUT /api/books/:id/lessons/:lid` يحفظ التعديلات
- [ ] `POST .../images` يرفع صورة
- [ ] `DELETE .../images/:imgId` يحذف صورة

### 3.4 Videos API Tests
- [ ] `POST /api/videos/generate/:id/:lid` يبدأ التوليد
- [ ] `GET /api/videos/status/:id/:lid` يعيد الحالة
- [ ] `POST /api/videos/cancel/:id/:lid` يلغي
- [ ] `GET /api/videos/:id/:lid/file` يخدم MP4
- [ ] `POST /api/videos/export-education` يصدّر JSON

### 3.5 Pipeline API Tests
- [ ] `GET /api/config` يعيد الإعدادات
- [ ] `POST /api/config` يحفظ الإعدادات
- [ ] `GET /api/system/status` يعيد GPU/RAM/Disk

---

## 🎨 Phase 4: Frontend Checklist

### 4.1 Setup
- [ ] Next.js 15 يعمل على port 3000
- [ ] shadcn/ui مثبت
- [ ] Tailwind 4 يعمل
- [ ] خط Cairo محمّل
- [ ] Dark mode مفعّل

### 4.2 Layout
- [ ] Sidebar يظهر في كل الصفحات
- [ ] Links تعمل للتنقل
- [ ] Header يظهر حالة النظام
- [ ] Responsive (mobile + desktop)

### 4.3 Dashboard Page
- [ ] بطاقات الإحصائيات تعرض أرقام صحيحة
- [ ] قائمة الكتب تُحدّث تلقائياً
- [ ] قائمة الانتظار تُحدّث لحظياً (WebSocket)

### 4.4 Books Page
- [ ] زر "رفع كتاب" يفتح modal
- [ ] رفع PDF يعمل
- [ ] بطاقات الكتب تعرض الحالة
- [ ] شريط التقدم يعمل
- [ ] أزرار الحذف تعمل (مع تأكيد)

### 4.5 Lesson Editor
- [ ] التبويبات تعمل
- [ ] TextEditor يحفظ التغييرات
- [ ] TextEditor يدعم KaTeX ($$...$$)
- [ ] ImageManager يعرض الصور
- [ ] ImageManager يرفع صور جديدة
- [ ] TableEditor يضيف/يحذف صفوف
- [ ] FormulaEditor يعرض preview
- [ ] QuestionEditor يدعم 4 أنواع
- [ ] حفظ تلقائي كل 30 ثانية
- [ ] زر "توليد الفيديو" يعمل

### 4.6 Video Studio
- [ ] قائمة الدروس تعرض الحالة
- [ ] Checkboxes تعمل
- [ ] زر "توليد المحدد" يعمل
- [ ] سجل العمليات يتحدث لحظياً
- [ ] Video player يشغل MP4
- [ ] زر "تصدير" يحمّل JSON

### 4.7 Settings
- [ ] نموذج VLM يحفظ
- [ ] نموذج TTS يحفظ
- [ ] نموذج الفيديو يحفظ
- [ ] نموذج R2 يحفظ
- [ ] زر "اختبار R2" يعمل

---

## 🎬 Phase 5: Video Pipeline Checklist

### 5.1 Remotion Components
- [ ] `LessonVideo.tsx` يقرأ props من ملف
- [ ] المدة تُحسب تلقائياً من scenes
- [ ] `FormulaWrite` يعرض أي formula
- [ ] `SimulatorCinematic` يقبل config
- [ ] `MindMapCinematic` يقبل nodes
- [ ] `QuizCinematic` يقبل questions
- [ ] `ImageDisplay` يعرض صورة
- [ ] `TableDisplay` يعرض جدول

### 5.2 Scripts
- [ ] `generate-script.py` يحوّل lesson.json لسكريبت
- [ ] `generate_tts.py` يقرأ من lesson.json
- [ ] `render-video.js` ينفذ العملية كاملة:
  - [ ] توليد السكريبت
  - [ ] توليد الصوت
  - [ ] Remotion render
  - [ ] FFmpeg compress
  - [ ] تحديث lesson.json
- [ ] `export-education.js` يصدّر JSON صحيح

### 5.3 Queue System
- [ ] `queue-manager.js` يضيف دروساً
- [ ] `queue-worker.js` يعالج بالتسلسل
- [ ] الحالة تتحدث في lesson.json
- [ ] Socket.io يبث التحديثات
- [ ] إمكانية الإيقاف المؤقت
- [ ] إمكانية الاستئناف

---

## 🔗 Phase 6: Integration Checklist

### 6.1 End-to-End Test
- [ ] رفع كتاب PDF
- [ ] بدء الاستخراج
- [ ] انتظار اكتمال الاستخراج
- [ ] فتح درس للمراجعة
- [ ] تعديل النص
- [ ] إضافة صورة
- [ ] تعديل جدول
- [ ] تعديل صيغة
- [ ] إضافة سؤال
- [ ] توليد الفيديو
- [ ] انتظار اكتمال الفيديو
- [ ] معاينة الفيديو
- [ ] تصدير JSON لـ education

### 6.2 Resume Test
- [ ] بدء استخراج كتاب كبير
- [ ] إيقاف في المنتصف
- [ ] إعادة التشغيل
- [ ] التأكد من استئناف من حيث توقف

### 6.3 Failure Recovery
- [ ] محاكاة فشل VLM في صفحة
- [ ] التأكد من تسجيل الخطأ
- [ ] التأكد من متابعة باقي الصفحات
- [ ] التأكد من إمكانية إعادة المحاولة

### 6.4 Performance
- [ ] سرعة استخراج: 1 صفحة/45 ثانية (متوقع)
- [ ] زمن توليد فيديو 75 ثانية: < 5 دقائق
- [ ] حجم فيديو نهائي: < 15MB
- [ ] استهلاك RAM: < 8GB
- [ ] استهلاك GPU VRAM: < 7GB

---

## 📤 Final Delivery Checklist

### الكود
- [ ] جميع الملفات مكتوبة
- [ ] لا أخطاء TypeScript
- [ ] لا أخطاء ESLint
- [ ] الكود موثق (JSDoc/TSDoc)

### التوثيق
- [ ] `README.md` محدث
- [ ] `PLAN.md` مكتمل
- [ ] `TODO.md` محدث
- [ ] `CHECKLIST.md` مكتمل
- [ ] `docs/USER_GUIDE.md` موجود
- [ ] `docs/API_REFERENCE.md` موجود

### الاختبار
- [ ] جميع اختبارات Phase 6 نجحت
- [ ] لا أخطاء حرجة
- [ ] الأداء ضمن المعايير

### النشر
- [ ] `git add .`
- [ ] `git commit -m "feat: unified video factory v2.0"`
- [ ] `git push origin main`
- [ ] إنشاء Tag `v2.0`
- [ ] كتابة Release Notes

---

## 🚨 Red Flags (علامات الخطر)

إذا ظهر أي من هذه، **توقف فوراً**:

- ❌ استهلاك GPU VRAM > 7.5GB
- ❌ استهلاك RAM > 14GB
- ❌ حرارة CPU > 90°C
- ❌ مساحة القرص < 5GB
- ❌ فشل 3 صفحات متتالية في VLM
- ❌ Remotion crash بدون رسالة خطأ واضحة

---

## 📞 روابط مهمة

- **الخطة الكاملة**: `PLAN.md`
- **قائمة المهام**: `TODO.md`
- **هذا الملف**: `CHECKLIST.md`
- **Repo**: https://github.com/enmohsen20111975/video-factory

---

**آخر تحديث**: 2025-01-15
**الحالة**: قيد التنفيذ
