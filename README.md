# 🎬 Smart Video Factory - مصنع الفيديوهات التعليمية الموحد

> **الإصدار**: v2.0 (Unified System)
> **الوصف**: نظام متكامل لإنتاج الفيديوهات التعليمية من الكتب الممسوحة ضوئياً، باستخدام VLM لتوليد الفيديوهات تلقائياً.

![Status](https://img.shields.io/badge/status-active-success)
![Version](https://img.shields.io/badge/version-2.0-blue)
![License](https://img.shields.io/badge/license-UNLICENSED-lightgrey)

---

## 🎯 نظرة عامة

نظام موحد يدير دورة حياة المحتوى التعليمي بالكامل:
1. **رفع كتاب كامل** (PDF ممسوح) → استخراج تلقائي للنصوص والصور والجداول والأسئلة
2. **محرر شامل** للمراجعة والتعديل قبل الإنتاج
3. **استوديو فيديو** لتوليد فيديو شرح لكل درس بضغطة زر
4. **إدارة مركزية** لكل الكتب والدروس والفيديوهات

---

## 🏗️ المعمارية

```
┌─────────────────────────────────────────────────────────────┐
│              🎛️ Dashboard (Next.js - port 3000)             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│           🌐 API Server (Express - port 3001)               │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────────┐   ┌───────────────┐
│ 📚 Content    │   │ 📝 Content        │   │ 🎬 Video      │
│   Ingest      │   │   Editor          │   │   Production  │
│               │   │                   │   │               │
│ • PDF→Images  │   │ • Rich Text       │   │ • TTS         │
│ • VLM Extract │   │ • Image Manager   │   │ • Remotion    │
│ • Auto-split  │   │ • Table Editor    │   │ • FFmpeg      │
│   Units/Lessons│   │ • Formula Editor  │   │ • Queue       │
└───────────────┘   │ • Question Editor │   └───────────────┘
                    └───────────────────┘
```

---

## 📦 المكونات الرئيسية

### 1. Backend API Server (`dashboard-server.js`)
- **المنفذ**: 3001
- **التقنية**: Express + Socket.io + Multer
- **الميزات**:
  - 24 API endpoint
  - رفع ملفات (PDF, صور)
  - تحديثات لحظية (WebSocket)
  - خدمة الملفات الثابتة مع Range support

### 2. Frontend Dashboard (`dashboard-app/`)
- **المنفذ**: 3000
- **التقنية**: Next.js 15 + React 19 + TypeScript + Tailwind 4
- **الميزات**:
  - 6 صفحات: Dashboard, Books, Book Detail, Lesson Editor, Video Studio, Settings
  - shadcn/ui (New York style)
  - دعم كامل للعربية (RTL) + خط Cairo
  - KaTeX للصيغ الرياضية
  - محرر محتوى متعدد التبويبات

### 3. Video Production Pipeline (`scripts/`)
- **السكربتات**:
  - `generate-script.py` - تحويل الدرس لسكريبت صوتي
  - `render-video.js` - orchestration كامل (10 خطوات)
  - `queue-worker.js` - معالج طابور الفيديو
  - `export-education.js` - تصدير JSON لمنصة education

### 4. Content Extractor (`content-extractor/`)
- **التقنية**: Python + Ollama VLM
- **النماذج**: qwen2-vl:7b (أساسي), gemma3:4b, qwen2-vl:2b (fallback)
- **المراحل**:
  1. PDF → صور (150 DPI)
  2. استخراج المحتوى بالـ VLM (صفحة بصفحة)
  3. دمج الصفحات
  4. توليد master.json + lesson.json

### 5. Remotion Components (`src/`)
- مكونات سينمائية ديناميكية:
  - `FormulaWrite` - عرض الصيغ الرياضية متحركة
  - `SimulatorCinematic` - محاكي الدائرة الكهربية
  - `MindMapCinematic` - خريطة ذهنية متحركة
  - `QuizCinematic` - اختبار تفاعلي مع تايمر
  - `ImageDisplay` - عرض الصور
  - `TableDisplay` - عرض الجداول

---

## 🚀 التشغيل السريع

### المتطلبات

| المكون | الإصدار | ملاحظات |
|--------|---------|---------|
| Node.js | 18+ | للأفضل 20+ |
| Python | 3.10+ | مطلوب للـ VLM و TTS |
| Ollama | أي إصدار | + نماذج qwen2-vl:7b |
| FFmpeg | أي إصدار | لضغط الفيديو |
| Chrome | أي إصدار | لـ Remotion rendering |

### 1. تثبيت الحزم

```bash
# تثبيت حزم المشروع الرئيسي
cd video-factory
npm install

# تثبيت حزم الـ dashboard
cd dashboard-app
npm install

# تثبيت حزم Python
cd ../content-extractor
pip install -r requirements.txt
```

### 2. تحميل نماذج Ollama

```bash
ollama pull qwen2-vl:7b
ollama pull gemma3:4b      # fallback
ollama pull qwen2-vl:2b    # fallback
```

### 3. تشغيل النظام

```bash
# Terminal 1: تشغيل Backend API
cd video-factory
npm run dashboard

# Terminal 2: تشغيل Frontend Dashboard
cd video-factory/dashboard-app
npm run dev

# Terminal 3: تشغيل Queue Worker (لتوليد الفيديوهات)
cd video-factory
npm run queue-worker
```

### 4. فتح لوحة التحكم

افتح المتصفح على: `http://localhost:3000`

---

## 📖 دليل الاستخدام

### رفع كتاب جديد

1. اذهب لصفحة **Books**
2. اضغط **"+ رفع كتاب جديد"**
3. املأ البيانات (العنوان، المادة، الصف)
4. ارفع ملف PDF
5. اضغط **"رفع"**

### استخراج المحتوى

1. اضغط على الكتاب في القائمة
2. اضغط **"بدء الاستخراج"**
3. انتظر (10 ثواني/صفحة تقريباً)
4. راجع الدروس المستخرجة

### مراجعة وتعديل درس

1. اضغط على أي درس في شجرة الكتاب
2. استخدم التبويبات:
   - **📝 النص**: تعديل النص والملخص
   - **🖼️ الصور**: إدارة الصور
   - **📊 الجداول**: تعديل الجداول
   - **🧮 الصيغ**: تعديل الصيغ (مع معاينة KaTeX)
   - **❓ الأسئلة**: إدارة الأسئلة (4 أنواع)
3. اضغط **"حفظ"** أو انتظر الحفظ التلقائي

### توليد فيديو

**لدرس واحد**:
1. افتح الدرس
2. اضغط **"🎬 توليد الفيديو"**

**لعدة دروس**:
1. اذهب لـ **Video Studio**
2. حدد الدروس (checkboxes)
3. اضغط **"🎬 توليد المحدد"**

### تصدير لمنصة education

1. اذهب لصفحة الكتاب
2. اضغط **"تصدير لـ education"**
3. حمّل ملف `education-export.json`
4. ارفعه على منصة education

---

## 📁 هيكل المشروع

```
video-factory/
├── 📋 PLAN.md                    # الخطة الكاملة
├── 📋 TODO.md                    # قائمة المهام
├── 📋 CHECKLIST.md               # قائمة التحقق
├── 📖 README.md                  # هذا الملف
│
├── 🌐 dashboard-server.js        # Backend API (Express)
├── 📦 package.json               # الحزم الرئيسية
│
├── 🎨 dashboard-app/             # Frontend (Next.js)
│   ├── src/
│   │   ├── app/                  # الصفحات
│   │   ├── components/           # المكونات
│   │   ├── hooks/                # React hooks
│   │   └── lib/                  # API client + types
│   └── package.json
│
├── 📚 content-extractor/         # استخراج المحتوى
│   ├── scripts/
│   │   ├── pdf-to-images.py
│   │   ├── extract-page.py
│   │   ├── merge-pages.py
│   │   ├── generate-markdown.py
│   │   └── generate-master.py    # جديد
│   ├── config/
│   │   ├── pipeline-config.json
│   │   └── extraction-prompt.txt
│   └── run-all.py
│
├── 🎬 src/                       # Remotion components
│   ├── Root.tsx
│   ├── compositions/
│   │   └── LessonVideo.tsx
│   └── components/
│       ├── FormulaWrite.tsx
│       ├── SimulatorCinematic.tsx
│       ├── MindMapCinematic.tsx
│       ├── QuizCinematic.tsx
│       ├── ImageDisplay.tsx      # جديد
│       └── TableDisplay.tsx      # جديد
│
├── 📊 data/                      # قاعدة البيانات
│   ├── books/
│   │   └── {book-id}/
│   │       ├── master.json
│   │       ├── source.pdf
│   │       ├── lessons/
│   │       ├── images/
│   │       └── videos/
│   ├── config/
│   │   └── pipeline-config.json
│   └── queue.json
│
├── 📜 scripts/                   # سكربتات الأتمتة
│   ├── generate_tts.py
│   ├── generate-script.py        # جديد
│   ├── render-video.js           # جديد
│   ├── queue-worker.js           # جديد
│   ├── export-education.js       # جديد
│   └── upload-r2.js              # اختياري
│
└── 🗃️ lib/                       # مكتبات مساعدة
    └── db/
        ├── books.js
        ├── lessons.js
        ├── queue.js
        └── config.js
```

---

## 🔧 الإعدادات

### إعدادات VLM
- **النموذج المفضل**: `qwen2-vl:7b`
- **Cooldown**: 10 ثواني بين الصفحات
- **GPU VRAM Limit**: 7GB
- **Temperature**: 0.1

### إعدادات TTS
- **الصوت**: `ar-EG-SalmaNeural` (مصري)
- **السرعة**: `+5%`
- **النبرة**: `+0Hz`

### إعدادات الفيديو
- **FPS**: 30
- **الدقة**: 1920×1080
- **Concurrency**: 4 أنوية
- **CRF**: 22 (H.264)
- **Audio**: AAC 128k

### إعدادات Cloudflare R2 (اختياري)
لرفع الفيديوهات تلقائياً على R2:
1. أنشئ حساب Cloudflare R2
2. أنشئ bucket
3. احصل على API keys
4. أدخلها في صفحة Settings

---

## 📊 API Reference

### Books
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/books` | قائمة الكتب |
| POST | `/api/books/upload` | رفع كتاب |
| GET | `/api/books/:id` | تفاصيل كتاب |
| DELETE | `/api/books/:id` | حذف كتاب |
| POST | `/api/books/:id/extract` | بدء الاستخراج |
| GET | `/api/books/:id/extract/status` | حالة الاستخراج |

### Lessons
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/books/:id/lessons` | قائمة الدروس |
| GET | `/api/books/:id/lessons/:lid` | تفاصيل درس |
| PUT | `/api/books/:id/lessons/:lid` | تحديث درس |
| POST | `/api/books/:id/lessons/:lid/images` | رفع صورة |
| POST | `/api/books/:id/lessons/:lid/review` | تمييز كمراجَع |

### Videos
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/videos/queue` | قائمة الانتظار |
| POST | `/api/videos/generate/:id/:lid` | توليد فيديو |
| POST | `/api/videos/generate-batch` | توليد مجموعة |
| GET | `/api/videos/status/:id/:lid` | حالة التوليد |
| GET | `/api/videos/:id/:lid/file` | تحميل MP4 |
| POST | `/api/videos/export-education` | تصدير JSON |

### Pipeline
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/config` | الإعدادات |
| POST | `/api/config` | حفظ الإعدادات |
| GET | `/api/system/status` | حالة النظام |

---

## 🛡️ بروتوكولات الأمان

### حماية اللابتوب
- ✅ VLM Cooldown: 10 ثواني/صفحة
- ✅ GPU VRAM Limit: 7GB
- ✅ Remotion Concurrency: 4 أنوية
- ✅ Queue Sequential: درس واحد في المرة
- ✅ FFmpeg Preset: fast (توازن السرعة/الجودة)

### حماية البيانات
- ✅ حفظ فوري لكل صفحة مستخرجة
- ✅ Resume Capability (تخطي المعالَج)
- ✅ Validation للـ JSON قبل الحفظ
- ✅ Backup تلقائي قبل التعديلات

---

## 🐛 استكشاف الأخطاء

### المشكلة: VLM لا يستجيب
```bash
# تحقق من Ollama
ollama list
ollama ps

# إعادة تشغيل
ollama serve
```

### المشكلة: خطأ في Remotion render
```bash
# تحقق من Chrome
which chrome || which chromium

# تثبيت Chrome إذا لزم
npx playwright install chromium
```

### المشكلة: FFmpeg غير موجود
```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# Windows: حمّل من ffmpeg.org
```

### المشكلة: الصوت لا يعمل
```bash
# تحقق من edge-tts
pip install edge-tts
python -c "import edge_tts; print('OK')"
```

---

## 📝 الترخيص

UNLICENSED - للاستخدام الخاص فقط

---

## 🤝 المساهمة

هذا مشروع خاص. للأسئلة أو الاقتراحات، يرجى التواصل مباشرة.

---

## 📚 التوثيق الإضافي

- [الخطة الكاملة](PLAN.md)
- [قائمة المهام](TODO.md)
- [قائمة التحقق](CHECKLIST.md)
- [دليل Dashboard](dashboard-app/README.md)
- [دليل Content Extractor](content-extractor/README.md)

---

**آخر تحديث**: يناير 2025
**الإصدار**: v2.0
**الحالة**: ✅ مكتمل وجاهز للاستخدام
