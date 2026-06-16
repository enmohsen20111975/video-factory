# SYSTEM FEATURE REQUEST: OCR & Content Extraction Engine
## Integration into Existing Educational Video Platform
## Target Hardware: Windows 11 Laptop, 32GB RAM, 8GB VRAM (NVIDIA)

---

## ⚠️ CRITICAL CONTEXT (READ FIRST)

This is NOT a new project. This is a FEATURE ADDITION to an existing educational video creation system running on a local laptop. The existing system uses:
- **Remotion** (React-based video generation) for creating educational videos
- **Next.js** for the web platform
- **Local AI models** via Ollama for content processing
- **Structured Markdown/JSON templates** for lesson content (6 chunks: Video Script, Mind Map, Infographic, Simulator, Quiz, Cheat Sheet)

The user has 32GB RAM and 8GB VRAM. The system must run LOCALLY without cloud APIs for OCR. The user has Ollama, LM Studio, and Pinokio installed.

**Previous issue:** The user tried to process entire books at once, causing system crashes. The solution must process ONE PAGE AT A TIME with cooldown periods and immediate save-after-each-page.

---

## 🎯 FEATURE OBJECTIVE

Build an **OCR & Content Extraction Pipeline** that:
1. Takes scanned PDF books (external Egyptian high school books like المعاصر, الامتحان, التفوق)
2. Converts PDF pages to optimized images
3. Uses a local Vision-Language Model (VLM) via Ollama to extract structured educational content
4. Outputs structured JSON/Markdown that feeds directly into the existing Remotion video templates
5. Integrates seamlessly with the existing `video-factory/` folder structure

---

## 🏗️ SYSTEM ARCHITECTURE (How It Fits)

### Existing Folder Structure:
```
video-factory/                    ← Existing Remotion project
├── src/
│   ├── components/               ← Existing video components
│   ├── compositions/             ← Existing video templates
│   ├── data/                     ← Existing lesson data (Markdown/JSON)
│   └── assets/                   ← Existing voiceovers, images, music
├── public/
│   └── exported/                 ← Exported MP4 videos
└── remotion.config.ts

NEW: Add this parallel pipeline:
├── content-extractor/            ← NEW FEATURE (this request)
│   ├── input/                    ← PDF books dropped here
│   │   ├── physics-moaser.pdf
│   │   └── chemistry-emtehan.pdf
│   ├── output/                   ← Extracted structured content
│   │   ├── raw-json/             ← Per-page JSON from VLM
│   │   ├── merged-lessons/       ← Merged into lesson files
│   │   └── final-markdown/       ← Final 6-chunk Markdown files
│   ├── scripts/
│   │   ├── pdf-to-images.py      ← Step 1: PDF → PNG (PyMuPDF)
│   │   ├── extract-page.py       ← Step 2: PNG → JSON (Ollama VLM)
│   │   ├── merge-pages.py        ← Step 3: JSON pages → Lesson JSON
│   │   └── generate-markdown.py  ← Step 4: Lesson JSON → Final Markdown
│   ├── config/
│   │   ├── extraction-prompt.txt ← VLM system prompt
│   │   └── book-index.json       ← Maps PDF pages to lessons
│   └── temp/                     ← Resized images, cache
```

### Integration Flow:
```
External Book PDF (المعاصر/الامتحان)
    ↓
[1] pdf-to-images.py → page_001.png, page_002.png... (150 DPI, max 512px)
    ↓
[2] extract-page.py → Ollama VLM (Qwen2-VL:7b or Gemma3:4b)
    ↓
    Per-page JSON: {page_type, title, formulas, examples, exercises, raw_text}
    ↓
[3] merge-pages.py → Group pages into lessons (lesson_01.json, lesson_02.json...)
    ↓
[4] generate-markdown.py → Convert to final 6-chunk Markdown format
    ↓
    video-factory/src/data/lessons/lesson-01-ohms-law.md
    ↓
    Existing Remotion system reads this → generates video
```

---

## 📋 DETAILED REQUIREMENTS

### REQUIREMENT 1: PDF to Image Converter (pdf-to-images.py)

**Input:** Scanned PDF file (e.g., `physics-moaser.pdf`)
**Output:** Folder of PNG images (`temp/page_001.png`, `temp/page_002.png`...)

**Constraints (CRITICAL - based on 8GB VRAM):**
- DPI: 150 (not 200, not 300). 150 is sufficient for formula reading but keeps image size small.
- Max dimension: 512 pixels (resize if larger). This is NON-NEGOTIABLE for 8GB VRAM.
- Color mode: RGB (convert from RGBA if needed)
- Format: PNG with optimization
- One page = one image file

**Features:**
- Skip already-processed pages (check if image exists)
- Progress logging: "Converting page 45/200..."
- Handle corrupted pages gracefully (skip with warning)
- Support both scanned PDFs (images) and text-based PDFs

**Python libraries:** `PyMuPDF (fitz)`, `Pillow (PIL)`

---

### REQUIREMENT 2: Single-Page VLM Extractor (extract-page.py)

**Input:** One PNG image file (512px max, 150 DPI)
**Output:** One JSON file (`raw-json/page_045.json`)
**Processing:** ONE PAGE AT A TIME. Never batch multiple pages.

**VLM Configuration:**
- **Primary model:** `qwen2-vl:7b` via Ollama (best for formulas and tables)
- **Fallback model:** `gemma3:4b` if 7b crashes (lighter, faster)
- **Last resort:** `qwen2-vl:2b` if even 4b crashes
- **Temperature:** 0.1 (high accuracy, low creativity)
- **Max tokens:** 2048
- **Context window:** 4096

**CRITICAL: Hardware Safety Protocols:**
```python
# These are MANDATORY, not optional:

1. ONE_IMAGE_PER_REQUEST = True
   # Never send multiple images in one Ollama call

2. COOLDOWN_SECONDS = 10
   # Wait 10 seconds between each page to let GPU cool down

3. IMMEDIATE_SAVE = True
   # Save JSON to disk IMMEDIATELY after each page extraction
   # Never keep results in memory only

4. GPU_MONITORING = True
   # Check VRAM usage before each request
   # If VRAM > 7GB, wait 30 seconds and retry

5. RESUME_CAPABILITY = True
   # Check if page JSON already exists
   # If yes, skip (allows resuming after crash)

6. ERROR_HANDLING = True
   # If Ollama crashes on a page:
   #   - Save error JSON: {"page": 45, "status": "failed", "error": "..."}
   #   - Continue to next page (don't stop entire book)
   #   - Log: "Page 45 failed, continuing..."
```

**Extraction Prompt (System Prompt for VLM):**

You are an expert Egyptian educational content extractor. You read scanned textbook pages and extract structured educational data.

Read this page carefully. It is from an Egyptian high school textbook (Thanaweya Amma). Extract the following in JSON format:

```json
{
  "page_number": 45,
  "page_type": "lesson" | "exercise" | "example" | "summary" | "empty" | "unclear",
  "lesson_title": "Title if present, else null",
  "lesson_subtitle": "Sub-topic if present, else null",
  "content_summary": "Brief summary of what this page contains (2-3 sentences in Arabic)",

  "definitions": [
    {"term": "الشحنة الكهربية", "definition": "..."}
  ],

  "formulas": [
    {"formula_latex": "I = \frac{Q}{t}", "description": "شدة التيار = الشحنة ÷ الزمن", "variables": [{"symbol": "I", "meaning": "شدة التيار", "unit": "أمبير"}]}
  ],

  "examples": [
    {
      "question": "Example problem text...",
      "solution_steps": ["Step 1...", "Step 2..."],
      "final_answer": "6 A",
      "formula_used": "I = Q/t"
    }
  ],

  "exercises": [
    {
      "question": "Exercise text...",
      "answer": "Answer if visible",
      "type": "mcq" | "numerical" | "conceptual" | "true_false"
    }
  ],

  "tables": [
    {"description": "Table comparing DC and AC", "headers": ["DC", "AC"], "rows": 3}
  ],

  "figures": [
    {"description": "Circuit diagram with battery and resistor", "type": "circuit" | "graph" | "diagram"}
  ],

  "key_points": ["Point 1", "Point 2"],

  "raw_text": "Full extracted text from page (Arabic)...",

  "confidence": 0.85,
  "notes": "Any unclear parts or assumptions made"
}
```

Rules:
1. Write formulas in LaTeX format between $...$ or as raw LaTeX: \frac{Q}{t}
2. Use formal Arabic (فصحى) for raw_text, but note where colloquial explanations exist
3. If page is empty or unreadable, return page_type: "empty" or "unclear"
4. Do NOT invent content. If unsure, mark confidence below 0.5 and explain in notes
5. Always include units (V, A, Ω, C, s) with every numerical value
6. If an example is solved step-by-step in the book, extract ALL steps

---

### REQUIREMENT 3: Page Merger (merge-pages.py)

**Input:** Folder of raw JSON files (`raw-json/page_*.json`)
**Output:** Merged lesson JSON files (`merged-lessons/lesson-01.json`)

**Logic:**
The user provides a simple index file mapping page ranges to lessons:

```json
{
  "book": "المعاصر فيزياء 3 ثانوي",
  "subject": "physics",
  "grade": "3",
  "term": "1",
  "lessons": [
    {"id": "lesson-01", "title": "الكميات الفيزيائية", "pages": [1, 2, 3]},
    {"id": "lesson-02", "title": "شدة التيار الكهربي", "pages": [4, 5, 6, 7]},
    {"id": "lesson-03", "title": "المقاومة الكهربية", "pages": [8, 9, 10]}
  ]
}
```

**Features:**
- Merge all page JSONs for each lesson into one lesson JSON
- Concatenate raw_text
- Merge formulas, examples, exercises arrays
- Detect and remove duplicates (same formula appearing on consecutive pages)
- Generate lesson-level summary
- Flag lessons with low confidence pages for human review

---

### REQUIREMENT 4: Markdown Generator (generate-markdown.py)

**Input:** Merged lesson JSON (`merged-lessons/lesson-01.json`)
**Output:** Final Markdown file following the EXISTING 6-chunk template

**Output format must match the existing template exactly:**

```markdown
---
lesson_id: "phy-3-1-1-02"
subject: "physics"
grade: "3"
term: "1"
chapter_id: "ch-01-current-electricity"
chapter_name: "التيار الكهربي وقانون أوم"
lesson_order: 2
lesson_title: "شدة التيار الكهربي"
duration_minutes: 12
difficulty: "medium"
learning_objectives:
  - "تعريف شدة التيار الكهربي"
  - "فهم العلاقة I = Q/t"
prerequisites:
  - "phy-3-1-1-01"
simulator_id: "current-meter-basic"
quiz_question_count: 5
formulas:
  - "I = \frac{Q}{t}"
  - "I = n A e V_d"
tags: ["current", "ammeter", "charge"]
---

# 🎬 Chunk 1: Video Script (سكريبت الفيديو)

## عنوان الفيديو
"[Auto-generated from lesson title]"

## السكريبت (بالعامية المصرية)
[Auto-generated from content_summary + examples]
... (follow existing template structure)

# 🧠 Chunk 2: Mind Map (الخريطة الذهنية)
... (generate from definitions + formulas + key_points)

# 📖 Chunk 3: Text Content + Infographics
... (generate from raw_text + tables + figures)

# 🧪 Chunk 4: Simulator Description
... (generate from figures + formulas + examples)

# ⚡ Chunk 5: Question Bank
... (generate from exercises + create new questions from examples)

# 🏆 Chunk 6: Cheat Sheet + Flashcards
... (generate from formulas + key_points + definitions)
```

**Generation Rules:**
- Convert formal Arabic (from book) to Egyptian colloquial Arabic (عامية مصرية) for video scripts
- Use existing template structure exactly (same headers, same YAML frontmatter)
- Generate 5 questions per lesson (3 MCQ, 1 numerical, 1 conceptual) from exercises + examples
- Create simulator description based on figures and formulas
- Generate mind map JSON from definitions and key points
- Include confidence warnings: "⚠️ This content was auto-extracted. Please verify formulas."

---

## 🔧 TECHNICAL SPECIFICATIONS

### Hardware Constraints (NON-NEGOTIABLE):
```
OS: Windows 11 64-bit
RAM: 32 GB (available for use: ~24 GB after OS overhead)
VRAM: 8 GB NVIDIA GPU
GPU: Must use GPU for VLM, not CPU (CPU would be too slow)
Storage: SSD recommended (fast read/write for page-by-page processing)
```

### Software Stack:
```
Python: 3.10+ (existing installation)
Ollama: Already installed (must use existing installation)
PyMuPDF: For PDF processing (pip install pymupdf)
Pillow: For image processing (pip install Pillow)
psutil: For GPU/CPU monitoring (pip install psutil)
```

### Ollama Configuration:
```bash
# User must have these models pulled (provide instructions):
ollama pull qwen2-vl:7b      # Primary
ollama pull gemma3:4b        # Fallback  
ollama pull qwen2-vl:2b      # Emergency fallback
```

### VLM Request Format (Ollama API):
```python
import ollama

response = ollama.chat(
    model="qwen2-vl:7b",
    messages=[{
        "role": "user",
        "content": extraction_prompt,  # From extraction-prompt.txt
        "images": ["temp/page_045_small.png"]  # ONE image only
    }],
    options={
        "temperature": 0.1,
        "num_predict": 2048,
        "num_ctx": 4096
    }
)
```

### GPU Monitoring (Windows):
```python
# Use nvidia-ml-py3 or simple polling
# Before each request, check VRAM:
# If used VRAM > 7GB, sleep 30 seconds and retry
# If crash occurs, catch exception, save error, continue
```

---

## 📊 PERFORMANCE TARGETS

| Metric | Target | Notes |
|--------|--------|-------|
| Image conversion | < 1 sec/page | PyMuPDF is fast |
| VLM extraction | 15-30 sec/page | Depends on model size |
| Cooldown between pages | 10 seconds | Mandatory for GPU health |
| Total time per page | ~30-45 seconds | Including cooldown |
| 200-page book | ~2-3 hours | Overnight processing |
| Memory usage per page | < 2GB VRAM | 512px image + 7B model |
| Resume after crash | Immediate | Check existing JSON files |

---

## 🚨 ERROR HANDLING & RESILIENCE

### Scenario 1: Ollama crashes on page 45
```
Action:
1. Catch exception
2. Save: raw-json/page_045_error.json = {"error": "Ollama timeout", "timestamp": "..."}
3. Log: "❌ Page 45 failed: Ollama timeout. Continuing..."
4. Wait 60 seconds (extra cooldown)
5. Continue to page 46
```

### Scenario 2: VRAM runs out mid-processing
```
Action:
1. Check VRAM before each request (psutil or nvidia-ml)
2. If VRAM > 7GB: sleep 30 seconds, recheck
3. If still > 7GB: switch to smaller model (7b → 4b → 2b)
4. Log: "⚠️ High VRAM detected. Switching to gemma3:4b..."
```

### Scenario 3: System reboot/crash during processing
```
Action:
1. On restart, script checks raw-json/ folder
2. Finds page_001.json through page_044.json exist
3. Starts from page_045 automatically
4. Log: "📂 Found 44 completed pages. Resuming from page 45..."
```

### Scenario 4: Image is corrupted or unreadable
```
Action:
1. VLM returns: {"page_type": "unclear", "confidence": 0.1}
2. Save anyway
3. Log: "⚠️ Page 45 unclear. Manual review needed."
4. Continue to next page
```

---

## 🎨 USER INTERFACE (CLI)

Simple command-line interface:

```bash
# Step 1: Convert PDF to images
python pdf-to-images.py --input "books/physics-moaser.pdf" --output "temp/"
# Output: ✅ Converted 200 pages to images

# Step 2: Extract content from images (ONE BY ONE)
python extract-page.py --input "temp/" --output "raw-json/" --model "qwen2-vl:7b" --start 1 --end 200
# Output:
# 🔍 Page 1/200... ✅ Success (lesson)
# ⏳ Cooldown 10s...
# 🔍 Page 2/200... ✅ Success (lesson)
# ...
# 🔍 Page 45/200... ❌ Failed (timeout). Saved error. Continuing...
# ...
# 🎉 Done! 198/200 pages successful. 2 failed (see errors.json)

# Step 3: Merge pages into lessons
python merge-pages.py --index "config/book-index.json" --input "raw-json/" --output "merged-lessons/"
# Output: ✅ Created 24 lesson files

# Step 4: Generate final Markdown
python generate-markdown.py --input "merged-lessons/" --output "video-factory/src/data/lessons/"
# Output: ✅ Created 24 Markdown files ready for Remotion
```

---

## ✅ DELIVERABLES

The AI coder must provide:

1. **Python scripts** (4 files):
   - `pdf-to-images.py` - PDF to optimized PNG converter
   - `extract-page.py` - Single-page VLM extractor with safety protocols
   - `merge-pages.py` - Page merger into lessons
   - `generate-markdown.py` - Markdown generator matching existing template

2. **Configuration files**:
   - `extraction-prompt.txt` - VLM system prompt
   - `config.example.json` - Example book index mapping

3. **Setup instructions**:
   - `README.md` - How to install dependencies, pull Ollama models, run pipeline
   - `requirements.txt` - Python dependencies

4. **Integration documentation**:
   - How the output feeds into existing `video-factory/src/data/lessons/`
   - How to verify and correct auto-extracted content

---

## ❌ EXPLICITLY FORBIDDEN

- ❌ Do NOT process multiple pages in one VLM request (causes VRAM crash)
- ❌ Do NOT use cloud APIs (OpenAI, Google Vision, etc.) - must be local only
- ❌ Do NOT keep results in memory without saving to disk
- ❌ Do NOT process entire books without cooldown periods
- ❌ Do NOT use image sizes larger than 512px max dimension
- ❌ Do NOT modify existing Remotion components or video templates
- ❌ Do NOT create new database schemas or change existing data structures
- ❌ Do NOT build a web UI for this feature (CLI only, runs on laptop)
- ❌ Do NOT use Three.js, WebGL, or complex graphics for this feature
- ❌ Do NOT invent content if VLM output is unclear (mark as low confidence)

---

## ✅ EXPLICITLY REQUIRED

- ✅ Must use existing Ollama installation (do not install alternative LLM servers)
- ✅ Must process ONE page per VLM request
- ✅ Must save JSON immediately after each page (no batching in memory)
- ✅ Must implement 10-second cooldown between pages
- ✅ Must implement resume capability (check existing files before processing)
- ✅ Must handle errors gracefully (continue on failure, don't stop)
- ✅ Must monitor GPU VRAM and pause if >7GB used
- ✅ Must output exact Markdown format matching existing 6-chunk template
- ✅ Must include confidence scores and warnings in output
- ✅ Must work on Windows 11 with Python 3.10+
- ✅ Must use PyMuPDF and Pillow (lightweight, no heavy ML libraries)

---

## 🧪 TESTING REQUIREMENTS

Before delivery, test with:
1. One 5-page PDF sample (provided by user)
2. Verify: images are 512px max
3. Verify: Ollama processes one page at a time
4. Verify: JSON saved immediately after each page
5. Verify: 10-second cooldown occurs
6. Verify: Resume works (stop mid-way, restart, continues from last page)
7. Verify: Output Markdown matches existing template exactly
8. Verify: Formulas are in valid LaTeX format

---

## 📞 QUESTIONS FOR THE USER (if unclear)

1. What is the exact path to your existing `video-factory/` folder?
2. Do you have PyMuPDF and Pillow installed, or should the script install them?
3. Which Ollama models do you currently have pulled? (run `ollama list`)
4. Do you have a sample PDF page to test with?
5. Should the script auto-detect lesson boundaries from page headers, or will you provide the page-to-lesson mapping index?

---

END OF FEATURE REQUEST
