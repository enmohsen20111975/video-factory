# 🎯 الخطة الشاملة: نظام مصنع الفيديو الموحد (Unified Video Factory)

> **الهدف**: بناء نظام واحد متكامل يدير دورة حياة المحتوى التعليمي بالكامل، من رفع الكتاب الممسوح حتى توليد فيديو شرح احترافي لكل درس، عبر لوحة تحكم واحدة شاملة.

---

## 📋 جدول المحتويات

1. [نظرة عامة على النظام](#1-نظرة-عامة-على-النظام)
2. [المعمارية الكاملة](#2-المعمارية-الكاملة)
3. [هيكل البيانات الموحد](#3-هيكل-البيانات-الموحد)
4. [المراحل الإنتاجية الأربعة](#4-المراحل-الإنتاجية-الأربعة)
5. [واجهة المستخدم (UI/UX)](#5-واجهة-المستخدم-uiux)
6. [Backend API](#6-backend-api)
7. [هيكل المجلدات](#7-هيكل-المجلدات)
8. [التقنيات المستخدمة](#8-التقنيات-المستخدمة)
9. [خطة التنفيذ التفصيلية](#9-خطة-التنفيذ-التفصيلية)
10. [بروتوكولات الأمان والأداء](#10-بروتوكولات-الأمان-والأداء)
11. [معايير القبول والاختبار](#11-معايير-القبول-والاختبار)

---

## 1. نظرة عامة على النظام

### المشكلة الحالية
- المشروع الحالي `video-factory` يعمل بـ "درس واحد في كل مرة" (ohm-law فقط)
- لا يوجد نظام إدارة كتب متعددة
- المحتوى المستخرج غير منظم في ملفات قابلة للتعديل
- لا يوجد محرر مرئي للمحتوى قبل توليد الفيديو
- عملية ربط الدروس بالفيديوهات يدوية بالكامل

### الحل المقترح
نظام موحد يوفر:
1. **رفع كتاب كامل** (PDF ممسوح) → استخراج تلقائي للنصوص والصور والجداول والأسئلة
2. **محرر شامل** للمراجعة والتعديل قبل الإنتاج
3. **استوديو فيديو** لتوليد فيديو شرح لكل درس بضغطة زر
4. **إدارة مركزية** لكل الكتب والدروس والفيديوهات

### المبادئ التوجيهية
- ✅ **ملف واحد قابلة للتعديل** لكل درس (JSON + Markdown)
- ✅ **عملية قابلة للاستئناف** في أي مرحلة (Resume Capability)
- ✅ **حماية اللابتوب** من الحمل الزائد (Cooldowns + Concurrency Limits)
- ✅ **شفافية كاملة** في الحالة (Status Tracking في كل خطوة)
- ✅ **لا اختراع محتوى** - الـ VLM يستخرج فقط ما في الكتاب

---

## 2. المعمارية الكاملة

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          🎛️ لوحة التحكم الموحدة                            │
│                          (Unified Dashboard)                              │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  📚 الكتب    │  │  📝 المحرر   │  │  🎬 الفيديو  │  │  ⚙️ الإعدادات│ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          🌐 Backend API (Express)                         │
│                                                                          │
│  /api/books/*    /api/lessons/*    /api/videos/*    /api/pipeline/*      │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
│  📚 مرحلة 1       │    │  📝 مرحلة 2       │    │  🎬 مرحلة 3       │
│  Content Ingest   │    │  Content Editor   │    │  Video Production │
└───────────────────┘    └───────────────────┘    └───────────────────┘
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
│ • PDF → Images    │    │ • Rich Text Editor│    │ • TTS + Timestamps│
│ • VLM Extract     │    │ • Image Manager   │    │ • Remotion Render │
│ • Auto-segment    │    │ • Table Editor    │    │ • FFmpeg Compress │
│   (Units/Lessons) │    │ • Formula Editor  │    │ • Auto-upload R2  │
└───────────────────┘    └───────────────────┘    └───────────────────┘
```

---

## 3. هيكل البيانات الموحد

### 3.1 ملف الكتاب الرئيسي (master.json)

**المسار**: `data/books/{book-id}/master.json`

```json
{
  "book": {
    "id": "physics-3rd-secondary",
    "title": "الفيزياء للصف الثالث الثانوي",
    "subject": "physics",
    "grade": "3rd-secondary",
    "publisher": "المعاصر",
    "source_pdf": "books/physics-moaser.pdf",
    "total_pages": 200,
    "cover_image": "extracted/cover.png",
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T14:30:00Z",
    "extraction_status": "completed",
    "extraction_progress": 100
  },
  "units": [
    {
      "id": "unit-1",
      "title": "الفيزياء الكهربية",
      "order": 1,
      "page_start": 1,
      "page_end": 60,
      "lessons": [
        {
          "id": "lesson-1-1",
          "title": "قانون أوم",
          "page_start": 45,
          "page_end": 52,
          "status": "extracted",
          "lesson_file": "lessons/lesson-1-1.json",
          "video_status": "not_generated"
        }
      ]
    }
  ],
  "stats": {
    "total_units": 5,
    "total_lessons": 32,
    "extracted_lessons": 32,
    "videos_generated": 12,
    "videos_pending": 20
  }
}
```

### 3.2 ملف الدرس الواحد (lesson.json)

**المسار**: `data/books/{book-id}/lessons/{lesson-id}.json`

```json
{
  "metadata": {
    "book_id": "physics-3rd-secondary",
    "unit_id": "unit-1",
    "lesson_id": "lesson-1-1",
    "title": "قانون أوم",
    "subtitle": "العلاقة بين الجهد والتيار والمقاومة",
    "page_start": 45,
    "page_end": 52,
    "subject": "physics",
    "grade": "3rd-secondary",
    "duration_minutes": 8,
    "difficulty": "medium",
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T14:30:00Z"
  },
  
  "content": {
    "raw_text": "النص الكامل المستخرج من الكتاب...",
    "summary": "يشرح هذا الدرس العلاقة بين الجهد الكهربي وشدة التيار والمقاومة الكهربية عبر قانون أوم.",
    "objectives": [
      "فهم مفهوم قانون أوم",
      "تطبيق القانون في حل المسائل",
      "تمييز العلاقات الطردية والعكسية"
    ],
    "definitions": [
      {
        "id": "def-001",
        "term": "قانون أوم",
        "definition": "الجهد الكهربي يساوي حاصل ضرب شدة التيار في المقاومة"
      }
    ],
    "formulas": [
      {
        "id": "form-001",
        "latex": "V = I \\times R",
        "description": "قانون أوم الأساسي",
        "variables": [
          {"symbol": "V", "meaning": "الجهد الكهربي", "unit": "فولت (V)"},
          {"symbol": "I", "meaning": "شدة التيار", "unit": "أمبير (A)"},
          {"symbol": "R", "meaning": "المقاومة الكهربية", "unit": "أوم (Ω)"}
        ]
      }
    ],
    "explanations": [
      {
        "id": "exp-001",
        "title": "شرح القانون",
        "text": "ينص قانون أوم على أن الجهد الكهربي...",
        "image_id": "img-001",
        "order": 1
      }
    ]
  },
  
  "images": [
    {
      "id": "img-001",
      "source_page": 47,
      "path": "images/lesson-1-1/img-001.png",
      "description": "دائرة كهربية توضح بطارية ومقاومة وأميتر",
      "type": "circuit",
      "width": 800,
      "height": 600
    }
  ],
  
  "tables": [
    {
      "id": "tbl-001",
      "title": "وحدات القياس الكهربية",
      "headers": ["الكمية", "الرمز", "الوحدة"],
      "rows": [
        ["الجهد", "V", "فولت"],
        ["التيار", "I", "أمبير"],
        ["المقاومة", "R", "أوم"]
      ]
    }
  ],
  
  "questions": [
    {
      "id": "q-001",
      "type": "mcq",
      "difficulty": "easy",
      "question": "مقاومة 5 أوم موصلة ببطارية 10 فولت. احسب التيار الناتج.",
      "options": ["0.5 أمبير", "1 أمبير", "2 أمبير", "5 أمبير"],
      "correct_index": 2,
      "explanation": "I = V ÷ R = 10 ÷ 5 = 2 أمبير",
      "formula_used": "I = V/R"
    },
    {
      "id": "q-002",
      "type": "numerical",
      "question": "احسب الجهد لو التيار 3A والمقاومة 4Ω",
      "answer": "12V",
      "explanation": "V = I × R = 3 × 4 = 12 فولت"
    }
  ],
  
  "scenes": [
    {"type": "intro", "duration_sec": 4, "title": "المقدمة"},
    {"type": "title", "duration_sec": 8, "title": "عنوان الدرس"},
    {"type": "formula", "duration_sec": 12, "formula_id": "form-001"},
    {"type": "simulator", "duration_sec": 16, "config": {"voltage": 9, "resistance": 3}},
    {"type": "mindmap", "duration_sec": 15},
    {"type": "quiz", "duration_sec": 15, "question_ids": ["q-001"]},
    {"type": "outro", "duration_sec": 5}
  ],
  
  "video": {
    "status": "not_generated",
    "script_text": "أهلاً بيكم في درس جديد...",
    "voice": "ar-EG-SalmaNeural",
    "video_url": null,
    "thumbnail_url": null,
    "duration_sec": 75,
    "rendered_at": null,
    "render_log": null,
    "file_size_mb": null
  },
  
  "extraction_meta": {
    "extracted_at": "2025-01-15T10:30:00Z",
    "model": "qwen2-vl:7b",
    "confidence": 0.92,
    "needs_review": false,
    "review_notes": ""
  }
}
```

### 3.3 حالات الدرس (Lesson Status)

| الحالة | الوصف | اللون |
|--------|-------|------|
| `pending` | بانتظار الاستخراج | رمادي |
| `extracting` | جاري الاستخراج | أصفر |
| `extracted` | تم الاستخراج، بانتظار المراجعة | أزرق |
| `reviewed` | تمت المراجعة وجاهز للفيديو | أخضر فاتح |
| `video_generating` | جاري توليد الفيديو | برتقالي |
| `video_generated` | تم توليد الفيديو بنجاح | أخضر |
| `failed` | فشل في إحدى المراحل | أحمر |

---

## 4. المراحل الإنتاجية الأربعة

### المرحلة 1: Content Ingest (استيعاب المحتوى)

**المدخلات**: ملف PDF ممسوح ضوئياً
**المخرجات**: master.json + ملفات الدروس + الصور

#### الخطوات:
1. **رفع PDF** إلى `books/` folder
2. **تحويل لصور** (`pdf-to-images.py`):
   - DPI: 150
   - Max Size: 512px
   - Format: PNG
3. **استخراج المحتوى** (`extract-page.py`):
   - Model: qwen2-vl:7b
   - Cooldown: 10 ثواني بين الصفحات
   - GPU VRAM Limit: 7GB
   - Resume capability (تخطي الصفحات المعالجة)
4. **دمج الصفحات** (`merge-pages.py`):
   - تجميع الصفحات حسب الدرس
   - إزالة التكرارات
   - حساب confidence score
5. **توليد master.json** (`generate-master.py`):
   - إنشاء هيكل الوحدات والدروس
   - ربط الصور بالدروس
   - استخراج الجداول والأسئلة

#### البرومبت المُحسّن:
راجع `content-extractor/config/extraction-prompt.txt` - تم تحسينه ليستخرج:
- تقسيم الدروس تلقائياً
- الصور مع وصفها
- الجداول كاملة
- الصيغ الرياضية بصيغة LaTeX
- الأسئلة مع إجاباتها

### المرحلة 2: Content Editor (محرر المحتوى)

**المدخلات**: master.json + lesson.json
**المخرجات**: lesson.json معدل

#### المميزات:
1. **محرر نصوص غني** (Rich Text Editor):
   - دعم كامل للعربية
   - دعم LaTeX للصيغ الرياضية (KaTeX)
   - دعم التشكيل
2. **مدير الصور**:
   - معاينة الصور المستخرجة
   - إضافة صور جديدة
   - تعديل الأوصاف
   - حذف الصور غير الضرورية
3. **محرر الجداول**:
   - إضافة/حذف صفوف وأعمدة
   - تعديل الخلايا
4. **محرر الصيغ**:
   - معاينة LaTeX مباشرة
   - تعديل المتغيرات والوحدات
5. **محرر الأسئلة**:
   - 4 أنواع: MCQ, Numerical, Conceptual, True/False
   - تعديل الخيارات والإجابات
   - إضافة شرح الحل

#### الحفظ التلقائي:
- كل تعديل يُحفظ فوراً في `lesson.json`
- نظام versions للرجوع لأي نسخة سابقة

### المرحلة 3: Video Production (إنتاج الفيديو)

**المدخلات**: lesson.json (مُراجع)
**المخرجات**: ملف MP4 مضغوط + رابط (لو R2 متاح)

#### الخطوات:
1. **توليد السكريبت** (`generate-script.py`):
   - تحويل المحتوى لسكريبت صوتي
   - لهجة قابلة للاختيار (عامية/فصحى)
   - إضافة علامات التوقيت للمشاهد
2. **توليد الصوت** (`generate_tts.py`):
   - Edge-TTS بالصوت المختار
   - إخراج: MP3 + JSON timestamps
3. **توليد الفيديو** (Remotion):
   - إنشاء composition ديناميكي
   - تمرير props من lesson.json
   - مدة الفيديو = مجموع مشاهد scenes
4. **ضغط الفيديو** (FFmpeg):
   - H.264, CRF 22, preset fast
   - Audio: AAC 128k
5. **رفع الفيديو** (اختياري):
   - Cloudflare R2 (موافق للـ Hostinger)
   - تحديث `video_url` في lesson.json

#### إدارة الطابور (Queue):
- نظام queue للدروس المختارة
- تشغيل تسلسلي (واحد تلو الآخر) لحماية الجهاز
- إمكانية الإيقاف المؤقت والاستئناف

### المرحلة 4: Distribution (التوزيع)

**المدخلات**: lesson.json + video.mp4
**المخرجات**: بيانات جاهزة لمنصة education

#### آلية الربط مع منصة education:
1. تصدير `lesson-export.json` يحتوي:
   - `lesson_id`
   - `title`
   - `video_url` (رابط R2 أو local)
   - `summary`
   - `questions`
2. يُرفع يدوياً لمنصة education
3. المنصة تعرض الفيديو + المحتوى + المحاكيات

---

## 5. واجهة المستخدم (UI/UX)

### 5.1 التصميم العام

- **Theme**: Dark mode (slate-900 + indigo accents)
- **Font**: Cairo (عربي) + Inter (إنجليزي)
- **Layout**: Sidebar + Main content area
- **Responsive**: Mobile-first

### 5.2 الشاشات الرئيسية

#### الشاشة 1: Dashboard الرئيسية
```
┌─────────────────────────────────────────────────────────────────┐
│  🎬 Smart Video Factory              [⚙️] [👤]                  │
├──────────┬──────────────────────────────────────────────────────┤
│          │                                                      │
│  📊 Home │  📊 إحصائيات سريعة                                  │
│  📚 Books│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │
│  📝 Edit │  │ 5 كتب  │ │ 32 درس │ │ 12 فيديو│ │ 20 قيد │       │
│  🎬 Video│  │        │ │        │ │        │ │ الانتظار│       │
│  ⚙️ Set  │  └────────┘ └────────┘ └────────┘ └────────┘       │
│          │                                                      │
│          │  📚 آخر الكتب                                        │
│          │  ┌──────────────────────────────────────────────┐  │
│          │  │ 📖 physics-3rd-secondary    ✅ 32/32 درس     │  │
│          │  │ 📖 chemistry-3rd-secondary ⏳ 15/40 درس      │  │
│          │  └──────────────────────────────────────────────┘  │
│          │                                                      │
│          │  🎬 قائمة الانتظار                                   │
│          │  • درس 1-2 قانون أوم (جاري الريندر)                 │
│          │  • درس 1-3 توصيل المقاومات (في الانتظار)            │
└──────────┴──────────────────────────────────────────────────────┘
```

#### الشاشة 2: مكتبة الكتب
```
┌─────────────────────────────────────────────────────────────────┐
│  📚 مكتبة الكتب                              [+ رفع كتاب جديد] │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 📖 physics-3rd-secondary.pdf                              │  │
│  │ الفيزياء - الصف الثالث الثانوي - المعاصر                  │  │
│  │ 200 صفحة | 5 وحدات | 32 درس                              │  │
│  │ ✅ مكتمل | 12 فيديو تم توليدها                            │  │
│  │ [فتح] [إعادة الاستخراج] [حذف]                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 📖 chemistry-3rd-secondary.pdf                            │  │
│  │ الكيمياء - الصف الثالث الثانوي                            │  │
│  │ 180 صفحة | 4 وحدات | 28 درس                              │  │
│  │ ⏳ جاري الاستخراج... 45/180                               │  │
│  │ [إيقاف] [عرض السجل]                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

#### الشاشة 3: محرر الدرس
```
┌─────────────────────────────────────────────────────────────────┐
│  📖 physics-3rd > الوحدة 1 > الدرس 1: قانون أوم   [💾 حفظ]    │
├─────────────────────────────────────────────────────────────────┤
│  [📝 النص] [🖼️ الصور] [📊 الجداول] [🧮 الصيغ] [❓ الأسئلة]   │
│                                                                │
│  📝 محرر النص:                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ ## قانون أوم                                              │ │
│  │                                                          │ │
│  │ ينص قانون أوم على أن الجهد الكهربي يساوي حاصل ضرب شدة   │ │
│  │ التيار في المقاومة الكهربية.                              │ │
│  │                                                          │ │
│  │ $$V = I \times R$$                                       │ │
│  │                                                          │ │
│  │ [B] [I] [U] [H1] [H2] [$] [🖼️] [📊]                    │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  📋 معلومات الدرس:                                             │
│  الصفحات: 45-52 | الحالة: ✅ مراجع | آخر تعديل: منذ 5 دقائق   │
│                                                                │
│  🎬 [توليد الفيديو]  [معاينة]  [تصدير JSON]                   │
└─────────────────────────────────────────────────────────────────┘
```

#### الشاشة 4: استوديو الفيديو
```
┌─────────────────────────────────────────────────────────────────┐
│  🎬 استوديو الفيديو                                             │
├─────────────────────────────────────────────────────────────────┤
│  📖 الكتاب: [physics-3rd-secondary ▾]                          │
│                                                                │
│  ☐ درس                                 حالة الفيديو   إجراءات  │
│  ──────────────────────────────────────────────────────────────│
│  ☐ 1-1 قانون أوم              ✅ مكتمل      [▶ تشغيل] [⬇️ تحميل]│
│  ☐ 1-2 توصيل المقاومات        🎬 جاري       [⏸ إيقاف]          │
│  ☐ 1-3 قانون كيرشوف           ⏳ في الانتظار [❌ إلغاء]         │
│  ☐ 1-4 المقاومة المكافئة      📝 يحتاج مراجعة [✏️ تحرير]      │
│  ☐ 2-1 المغناطيسية            ❌ فشل        [🔄 إعادة] [📜 سجل]│
│                                                                │
│  [🎬 توليد المحدد]  [🎬 توليد الكل]  [⬇️ تصدير لمنصة education]│
│                                                                │
│  📊 سجل العمليات:                                              │
│  [14:30] ✅ تم توليد فيديو "قانون أوم" (75 ثانية، 8.2MB)      │
│  [14:25] 🎬 بدء توليد "توصيل المقاومات"...                    │
└─────────────────────────────────────────────────────────────────┘
```

#### الشاشة 5: الإعدادات
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚙️ الإعدادات                                                  │
├─────────────────────────────────────────────────────────────────┤
│  🤖 نماذج VLM:                                                 │
│  - النموذج المفضل: [qwen2-vl:7b ▾]                            │
│  - Cooldown بين الصفحات: [10] ثانية                            │
│  - GPU VRAM Limit: [7168] MB                                   │
│                                                                │
│  🎙️ إعدادات الصوت:                                             │
│  - الصوت: [ar-EG-SalmaNeural ▾]                               │
│  - السرعة: [+5%]                                               │
│  - النبرة: [+0Hz]                                              │
│                                                                │
│  🎬 إعدادات الفيديو:                                           │
│  - FPS: [30]                                                   │
│  - الدقة: [1920x1080 ▾]                                        │
│  - Concurrency: [4] أنوية                                      │
│  - CRF: [22]                                                   │
│                                                                │
│  ☁️ Cloudflare R2 (اختياري):                                   │
│  - Account ID: [_______________]                               │
│  - Access Key: [_______________]                               │
│  - Secret Key: [_______________]                               │
│  - Bucket: [_______________]                                   │
│  - [اختبار الاتصال]                                            │
│                                                                │
│  [💾 حفظ الإعدادات]                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Backend API

### 6.1 Books API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/books` | قائمة كل الكتب |
| POST | `/api/books/upload` | رفع كتاب PDF جديد |
| GET | `/api/books/:bookId` | تفاصيل كتاب (master.json) |
| DELETE | `/api/books/:bookId` | حذف كتاب |
| POST | `/api/books/:bookId/extract` | بدء الاستخراج |
| GET | `/api/books/:bookId/extract/status` | حالة الاستخراج |
| POST | `/api/books/:bookId/extract/stop` | إيقاف الاستخراج |
| GET | `/api/books/:bookId/logs` | سجل العمليات |

### 6.2 Lessons API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/books/:bookId/lessons` | قائمة الدروس |
| GET | `/api/books/:bookId/lessons/:lessonId` | تفاصيل درس |
| PUT | `/api/books/:bookId/lessons/:lessonId` | تحديث درس |
| POST | `/api/books/:bookId/lessons/:lessonId/images` | رفع صورة |
| DELETE | `/api/books/:bookId/lessons/:lessonId/images/:imgId` | حذف صورة |
| POST | `/api/books/:bookId/lessons/:lessonId/review` | تمييز كمراجَع |

### 6.3 Videos API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/videos/queue` | قائمة الانتظار |
| POST | `/api/videos/generate/:bookId/:lessonId` | توليد فيديو لدرس |
| POST | `/api/videos/generate-batch` | توليد مجموعة فيديوهات |
| GET | `/api/videos/status/:bookId/:lessonId` | حالة التوليد |
| POST | `/api/videos/cancel/:bookId/:lessonId` | إلغاء التوليد |
| GET | `/api/videos/:bookId/:lessonId/file` | تحميل الفيديو |
| POST | `/api/videos/export-education` | تصدير JSON لمنصة education |

### 6.4 Pipeline API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/config` | الإعدادات الحالية |
| POST | `/api/config` | حفظ الإعدادات |
| GET | `/api/system/status` | حالة النظام (GPU, RAM, Disk) |

---

## 7. هيكل المجلدات

```
video-factory/
├── 📋 PLAN.md                          # هذا الملف - الخطة الكاملة
├── 📋 TODO.md                          # قائمة المهام
├── 📋 CHECKLIST.md                     # قائمة التحقق
├── 📋 README.md                        # دليل التشغيل
│
├── 📦 package.json                     # تم تحديثه
├── 📦 dashboard-server.js              # خادم لوحة التحكم الجديد
├── 📦 dashboard-app/                   # تطبيق Next.js للوحة التحكم
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx               # Dashboard الرئيسية
│   │   │   ├── books/page.tsx         # مكتبة الكتب
│   │   │   ├── books/[id]/page.tsx    # تفاصيل كتاب
│   │   │   ├── lessons/[id]/page.tsx  # محرر الدرس
│   │   │   ├── videos/page.tsx        # استوديو الفيديو
│   │   │   └── settings/page.tsx      # الإعدادات
│   │   ├── components/
│   │   │   ├── ui/                    # shadcn/ui components
│   │   │   ├── BookCard.tsx
│   │   │   ├── LessonEditor/
│   │   │   │   ├── TextEditor.tsx
│   │   │   │   ├── ImageManager.tsx
│   │   │   │   ├── TableEditor.tsx
│   │   │   │   ├── FormulaEditor.tsx
│   │   │   │   └── QuestionEditor.tsx
│   │   │   ├── VideoQueue.tsx
│   │   │   └── StatusBadge.tsx
│   │   └── lib/
│   │       ├── api.ts                 # API client
│   │       └── types.ts              # TypeScript types
│   └── package.json
│
├── 📚 content-extractor/               # بدون تغيير (موجود)
│   ├── scripts/
│   │   ├── pdf-to-images.py
│   │   ├── extract-page.py
│   │   ├── merge-pages.py
│   │   ├── generate-markdown.py
│   │   └── generate-master.py         # جديد - يولد master.json
│   └── config/
│       ├── pipeline-config.json
│       └── extraction-prompt.txt
│
├── 🎬 src/                             # كود Remotion (موجود + محسن)
│   ├── Root.tsx
│   ├── compositions/
│   │   └── LessonVideo.tsx            # محدد ليقرأ props ديناميكية
│   ├── components/
│   │   ├── FormulaWrite.tsx
│   │   ├── SimulatorCinematic.tsx
│   │   ├── MindMapCinematic.tsx
│   │   ├── QuizCinematic.tsx
│   │   ├── ImageDisplay.tsx           # جديد - يعرض صورة من الدرس
│   │   └── TableDisplay.tsx           # جديد - يعرض جدول
│   └── data/                          # يتم تجاهله، البيانات في data/
│
├── 📊 data/                            # جديد - قاعدة البيانات
│   ├── books/
│   │   └── {book-id}/
│   │       ├── master.json
│   │       ├── source.pdf
│   │       ├── lessons/
│   │       │   └── {lesson-id}.json
│   │       ├── images/
│   │       │   └── {lesson-id}/
│   │       │       └── img-001.png
│   │       └── videos/
│   │           └── {lesson-id}.mp4
│   └── config/
│       └── pipeline-config.json       # نسخة نشطة
│
├── 📜 scripts/                         # سكربتات الأتمتة
│   ├── generate_tts.py                # موجود
│   ├── generate-script.py             # جديد - يحول lesson.json لسكريبت صوتي
│   ├── render-video.js                # جديد - يدير عملية الريندر
│   ├── upload-r2.js                   # جديد - رفع لـ Cloudflare R2
│   └── export-education.js            # جديد - تصدير لمنصة education
│
├── 🎛️ dashboard.js                     # قديم - سيتم استبداله
├── 🚀 run-factory.js                   # محدث - يقرأ من data/
│
├── 📁 public/                          # ملفات Remotion الثابتة
│   ├── voiceovers/
│   ├── timestamps/
│   └── temp/
│
└── 📁 tests/                           # اختبارات (إن وجدت)
```

---

## 8. التقنيات المستخدمة

| الفئة | التقنية | الاستخدام |
|------|---------|---------|
| **Backend** | Node.js + Express | خادم API |
| **Frontend** | Next.js 15 + TypeScript | لوحة التحكم |
| **UI Components** | shadcn/ui + Tailwind CSS 4 | التصميم |
| **Database** | JSON Files (File-based) | تخزين البيانات |
| **PDF Processing** | pdf2pic + Python | تحويل PDF لصور |
| **VLM** | Ollama + qwen2-vl:7b | استخراج المحتوى |
| **TTS** | Edge-TTS (Python) | توليد الصوت |
| **Video Rendering** | Remotion 4 | إنتاج الفيديو |
| **Video Compression** | FFmpeg | ضغط MP4 |
| **Cloud Storage** | Cloudflare R2 (اختياري) | استضافة الفيديوهات |
| **Math Rendering** | KaTeX | عرض الصيغ الرياضية |
| **Rich Text** | TipTap / Lexical | محرر النصوص |

---

## 9. خطة التنفيذ التفصيلية

### Phase 1: البنية التحتية (Day 1)

#### 1.1 إنشاء هيكل المجلدات
- [ ] إنشاء `data/books/` و `data/config/`
- [ ] إنشاء `dashboard-app/` (Next.js)
- [ ] إنشاء `scripts/` الجديدة

#### 1.2 تحديث package.json
- [ ] إضافة dependencies جديدة (multer, socket.io, KaTeX)
- [ ] إضافة scripts جديدة

#### 1.3 إنشاء TypeScript Types
- [ ] `types/book.ts` - أنواع الكتاب
- [ ] `types/lesson.ts` - أنواع الدرس
- [ ] `types/api.ts` - أنواع API

### Phase 2: قاعدة البيانات (Day 1)

#### 2.1 إنشاء Master Schema
- [ ] كتابة `data/books/_template/master.template.json`
- [ ] كتابة `data/books/_template/lessons/lesson.template.json`
- [ ] كتابة validation functions

#### 2.2 تحديث extraction-prompt.txt
- [ ] إضافة تقسيم الدروس
- [ ] تحسين استخراج الصور
- [ ] تحسين استخراج الجداول

#### 2.3 إنشاء generate-master.py
- [ ] يقرأ raw-json
- [ ] يكتشف حدود الدروس
- [ ] يولد master.json + lesson.json لكل درس

### Phase 3: Backend API (Day 2)

#### 3.1 إنشاء dashboard-server.js
- [ ] إعداد Express
- [ ] إعداد Multer لرفع الملفات
- [ ] إعداد Socket.io للحالة اللحظية

#### 3.2 Books API
- [ ] GET /api/books
- [ ] POST /api/books/upload
- [ ] GET /api/books/:bookId
- [ ] DELETE /api/books/:bookId
- [ ] POST /api/books/:bookId/extract
- [ ] GET /api/books/:bookId/extract/status

#### 3.3 Lessons API
- [ ] GET /api/books/:bookId/lessons
- [ ] GET /api/books/:bookId/lessons/:lessonId
- [ ] PUT /api/books/:bookId/lessons/:lessonId
- [ ] POST /api/books/:bookId/lessons/:lessonId/images

#### 3.4 Videos API
- [ ] POST /api/videos/generate/:bookId/:lessonId
- [ ] GET /api/videos/status/:bookId/:lessonId
- [ ] POST /api/videos/cancel/:bookId/:lessonId
- [ ] POST /api/videos/export-education

### Phase 4: Frontend (Day 3-4)

#### 4.1 إعداد Next.js App
- [ ] إنشاء dashboard-app بـ Next.js 15
- [ ] تثبيت shadcn/ui
- [ ] إعداد Tailwind 4 + Cairo font

#### 4.2 Layout الرئيسي
- [ ] Sidebar navigation
- [ ] Header
- [ ] Main content area

#### 4.3 صفحة Dashboard
- [ ] إحصائيات سريعة
- [ ] آخر الكتب
- [ ] قائمة الانتظار

#### 4.4 صفحة الكتب
- [ ] قائمة الكتب
- [ ] نموذج رفع كتاب
- [ ] بطاقة كتاب مع حالة الاستخراج

#### 4.5 صفحة المحرر
- [ ] Rich Text Editor (TipTap)
- [ ] Image Manager
- [ ] Table Editor
- [ ] Formula Editor (KaTeX preview)
- [ ] Question Editor

#### 4.6 صفحة استوديو الفيديو
- [ ] قائمة الدروس
- [ ] أزرار توليد
- [ ] سجل العمليات اللحظي (WebSocket)

#### 4.7 صفحة الإعدادات
- [ ] نموذج الإعدادات
- [ ] اختبار R2

### Phase 5: Video Production Pipeline (Day 5)

#### 5.1 تحديث LessonVideo.tsx
- [ ] قراءة props من lesson.json
- [ ] دعم مشاهد ديناميكية
- [ ] دعم صور من الدرس
- [ ] دعم جداول

#### 5.2 إنشاء generate-script.py
- [ ] تحويل lesson.json لسكريبت
- [ ] دعم لهجتين (عامي/فصحى)
- [ ] إضافة علامات المشاهد

#### 5.3 تحديث run-factory.js
- [ ] قراءة من data/ بدلاً من src/data/
- [ ] دعم аргومنتات bookId, lessonId
- [ ] كتابة video_url في lesson.json

#### 5.4 نظام Queue
- [ ] queue.json لقائمة الانتظار
- [ ] queue-worker.js يعالج الدروس بالتسلسل
- [ ] إشعارات WebSocket بالتحديثات

### Phase 6: التكامل والاختبار (Day 6)

#### 6.1 اختبار شامل
- [ ] رفع كتاب تجريبي
- [ ] استخراج المحتوى
- [ ] مراجعة وتعديل
- [ ] توليد فيديو
- [ ] تصدير لمنصة education

#### 6.2 التوثيق
- [ ] تحديث README.md
- [ ] دليل التشغيل السريع
- [ ] دليل استكشاف الأخطاء

#### 6.3 Push نهائي لـ GitHub
- [ ] تأكيد جميع الملفات مرفوعة
- [ ] Tag الإصدار v2.0

---

## 10. بروتوكولات الأمان والأداء

### 10.1 حماية اللابتوب

| البروتوكول | القيمة | السبب |
|-----------|-------|------|
| VLM Cooldown | 10 ثواني/صفحة | منع ارتفاع حرارة GPU |
| GPU VRAM Limit | 7GB | منع OOM crashes |
| Remotion Concurrency | 4 cores (نصف الأنوية) | منع تجميد الجهاز |
| FFmpeg Preset | fast | توازن السرعة/الجودة |
| Queue Sequential | درس واحد في المرة | منع الحمل الزائد |

### 10.2 حماية البيانات

- ✅ **حفظ فوري**: كل صفحة مستخرجة تُحفظ فوراً
- ✅ **Resume Capability**: تخطي ما تم معالجته
- ✅ **Backup تلقائي**: نسخة احتياطية قبل كل تعديل
- ✅ **Validation**: التحقق من صحة JSON قبل الحفظ

### 10.3 مراقبة الأداء

- 📊 لوحة مراقبة GPU/RAM/CPU
- 📊 إحصائيات سرعة الاستخراج (صفحة/دقيقة)
- 📊 حجم الملفات الناتجة
- 📊 وقت الريندر لكل فيديو

---

## 11. معايير القبول والاختبار

### 11.1 معايير القبول لكل مرحلة

#### مرحلة الاستخراج:
- ✅ الكتاب يُرفع بنجاح
- ✅ جميع الصفحات تُحوّل لصور
- ✅ 90%+ من الصفحات تُستخرج بنجاح
- ✅ master.json يُولد بشكل صحيح
- ✅ كل درس له lesson.json

#### مرحلة المحرر:
- ✅ فتح أي درس وتعديله
- ✅ حفظ التعديلات
- ✅ معاينة الصيغ الرياضية (KaTeX)
- ✅ رفع وحذف الصور
- ✅ تعديل الجداول

#### مرحلة الفيديو:
- ✅ توليد فيديو من درس مُراجع
- ✅ مدة الفيديو صحيحة
- ✅ الصوت متزامن مع الترجمة
- ✅ حجم الملف النهائي < 15MB
- ✅ تحديث الحالة في master.json

### 11.2 اختبارات التكامل

| الاختبار | الخطوات المتوقعة | النتيجة المتوقعة |
|---------|-----------------|----------------|
| E2E Test 1 | رفع PDF → استخراج → مراجعة → فيديو | فيديو MP4 صالح |
| E2E Test 2 | توليد 5 فيديوهات متتالية | جميعها تكتمل بنجاح |
| Resume Test | إيقاف الاستخراج في المنتصف ثم استئناف | يكمل من حيث توقف |
| Failure Test | محاكاة فشل VLM في صفحة | تسجيل الخطأ ومتابعة الباقي |

---

## 🎯 الخلاصة

هذا النظام الموحد سيوفر:
1. **تجربة مستخدم سلسة** من رفع الكتاب حتى الفيديو النهائي
2. **تحكم كامل** في كل مرحلة من مراحل الإنتاج
3. **حماية اللابتوب** من الأحمال الزائدة
4. **قابلية التوسع** لإضافة مواد وكتب جديدة
5. **تكامل سهل** مع منصة education الموجودة

---

**آخر تحديث**: 2025-01-15
**الإصدار**: v2.0 (Unified System)
**الحالة**: قيد التنفيذ
