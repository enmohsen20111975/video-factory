# 📚 Content Extractor — OCR & Content Extraction Pipeline

A local OCR pipeline that extracts structured educational content from scanned Egyptian high school textbooks using a Vision-Language Model (VLM) via Ollama. The extracted content feeds directly into the video-factory Remotion video generation system.

## 🎯 What This Does

```
Scanned PDF Book (المعاصر / الامتحان / التفوق)
    ↓
[Step 1] pdf-to-images.py → Optimized PNG images (150 DPI, 512px max)
    ↓
[Step 2] extract-page.py → Per-page JSON (via Ollama VLM, ONE page at a time)
    ↓
[Step 3] merge-pages.py → Lesson-grouped JSON files
    ↓
[Step 4] generate-markdown.py → Final Markdown + JSON for Remotion
    ↓
Video-factory renders educational videos
```

## ⚠️ Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | Windows 11 64-bit | Windows 11 |
| RAM | 16 GB | 32 GB |
| GPU VRAM | 4 GB | 8 GB NVIDIA |
| Storage | 10 GB free | SSD |

**NON-NEGOTIABLE**: This system processes ONE page at a time to prevent GPU memory crashes. A 200-page book takes ~2-3 hours.

## 🚀 Quick Start

### 1. Install Python Dependencies

```bash
cd video-factory/content-extractor
pip install -r requirements.txt
```

### 2. Install & Pull Ollama Models

```bash
# If Ollama is not installed, download from: https://ollama.ai

# Pull the primary VLM model (best for Arabic + formulas)
ollama pull qwen2-vl:7b

# Pull fallback models (lighter, faster)
ollama pull gemma3:4b
ollama pull qwen2-vl:2b
```

### 3. Verify Ollama is Running

```bash
ollama list
# Should show qwen2-vl:7b, gemma3:4b, qwen2-vl:2b
```

### 4. Drop Your PDF Book

Place your scanned PDF file in the `books/` directory:

```bash
mkdir books
# Copy your PDF here, e.g.:
# books/physics-moaser.pdf
```

### 5. Run the Pipeline

#### Option A: Run Each Step Manually

```bash
# Step 1: Convert PDF to images (one-time, ~1 sec/page)
python scripts/pdf-to-images.py --input "books/physics-moaser.pdf" --output "temp/"

# Step 2: Extract content with VLM (main processing, ~45 sec/page including cooldown)
python scripts/extract-page.py --input "temp/" --output "raw-json/" --model "qwen2-vl:7b"

# Step 3: Merge pages into lessons
python scripts/merge-pages.py --index "config/book-index.json" --input "raw-json/" --output "merged-lessons/"

# Step 4: Generate final output for video-factory
python scripts/generate-markdown.py --input "merged-lessons/" --output "../src/data/"
```

#### Option B: Run All Steps at Once

```bash
python run-all.py --pdf "books/physics-moaser.pdf"
```

## 📁 Directory Structure

```
content-extractor/
├── README.md                    ← You are here
├── requirements.txt             ← Python dependencies
├── run-all.py                   ← One-click pipeline runner
│
├── config/
│   ├── extraction-prompt.txt    ← VLM system prompt (do not modify unless you know what you're doing)
│   └── book-index.json          ← Maps PDF pages to lessons (EDIT THIS for each book)
│
├── scripts/
│   ├── pdf-to-images.py         ← Step 1: PDF → PNG (PyMuPDF)
│   ├── extract-page.py          ← Step 2: PNG → JSON (Ollama VLM)
│   ├── merge-pages.py           ← Step 3: JSON pages → Lesson JSON
│   └── generate-markdown.py     ← Step 4: Lesson JSON → Final Markdown/JSON
│
├── books/                       ← Drop PDF books here (gitignored)
├── temp/                        ← Page images (auto-created, gitignored)
├── raw-json/                    ← Per-page VLM extractions (auto-created)
├── merged-lessons/              ← Merged lesson JSONs (auto-created)
│
└── ../src/data/                 ← Final output for video-factory
    ├── lessons/                 ← Markdown files (6-chunk format)
    └── *.json                   ← JSON files (Remotion-compatible)
```

## ⚙️ Configuration

### book-index.json

Edit `config/book-index.json` for each book you process. This maps page ranges to lessons:

```json
{
  "book": "المعاصر فيزياء 3 ثانوي",
  "subject": "physics",
  "grade": "3",
  "term": "1",
  "chapters": [
    {
      "id": "ch-01-current-electricity",
      "name": "التيار الكهربي وقانون أوم",
      "lessons": [
        {
          "id": "lesson-01",
          "title": "الكميات الفيزيائية الكهربية",
          "pages": [1, 2, 3]
        }
      ]
    }
  ],
  "notes": {
    "page_offset": 0,
    "skip_pages": []
  }
}
```

**Important**: The `pages` array lists lesson page numbers. The `page_offset` adds to these to get actual PDF page numbers (useful when the PDF has cover pages).

### Extraction Parameters

Default parameters in `extract-page.py` (safe for 8GB VRAM):

| Parameter | Value | Notes |
|-----------|-------|-------|
| Cooldown | 10 sec | Between each page |
| Max image size | 512 px | Prevents OOM |
| DPI | 150 | Good for formula reading |
| Temperature | 0.1 | High accuracy, low creativity |
| Max tokens | 2048 | Per page |
| Context window | 4096 | Per page |

## 🛡️ Safety Features

### GPU Protection
- **VRAM Monitoring**: Checks GPU VRAM before each request. Pauses if >7GB used.
- **One Image Per Request**: NEVER sends multiple images to prevent OOM.
- **Mandatory Cooldown**: 10-second pause between pages to let GPU cool.

### Resume Capability
- If the script crashes (power failure, Ollama crash, etc.), simply re-run it.
- It detects existing JSON files and resumes from the last processed page.
- Example: If it crashed on page 45, it will find pages 1-44 and start from 45.

### Error Handling
- If a page fails, the error is saved and processing continues to the next page.
- Failed pages get a JSON file with `"status": "failed"` and the error message.
- An `errors.json` summary is created at the end if any pages failed.

### Model Fallback Chain
If the primary model crashes:
1. `qwen2-vl:7b` → `gemma3:4b` → `qwen2-vl:2b`
2. Automatically switches to lighter model if OOM occurs.

## 🔍 Monitoring Progress

### During Extraction

```
  🔍 [1/200] Processing page 1...
  ✅ [1/200] Page 1 Saved (type=lesson, confidence=0.92) → page_0001.json
  ⏳ Cooldown 10s...
  🔍 [2/200] Processing page 2...
  ...
  ❌ [45/200] Page 45 Failed: Ollama timeout
       Saved error to page_0045.json
  ⏳ Cooldown 10s...
  ...
  🎉 Extraction complete!
     ✅ Success: 198/200
     ❌ Failed:  2
```

### Check Existing Progress

```bash
# Count completed pages
ls raw-json/page_*.json | wc -l

# Check for errors
cat raw-json/errors.json
```

## 📤 Output Integration

### Markdown Output (`lessons/lesson-XX.md`)

Contains the full 6-chunk format with YAML frontmatter:
- **Chunk 1**: Video Script (سكريبت الفيديو)
- **Chunk 2**: Mind Map (الخريطة الذهنية)
- **Chunk 3**: Text Content + Infographics
- **Chunk 4**: Simulator Description
- **Chunk 5**: Question Bank (بنك الأسئلة)
- **Chunk 6**: Cheat Sheet + Flashcards

### JSON Output (`lesson-XX.json`)

Remotion-compatible format matching the existing `ohm-law.json` structure:

```json
{
  "title": "شدة التيار الكهربي",
  "topic": "التيار الكهربي وقانون أوم",
  "voiceoverText": "أهلاً بيكم في درس جديد...",
  "formulaText": "I = \\frac{Q}{t}",
  "simulation": { "i": 0, "q": 0, "t": 0 }
}
```

### Integration with Video-Factory

The generated JSON files are output directly to `video-factory/src/data/`. To use them:

1. Add a new entry in the Remotion composition to reference the lesson:
   ```tsx
   <LessonVideo lessonName="lesson-02" title="شدة التيار الكهربي" />
   ```

2. Generate the voiceover using the existing TTS script:
   ```bash
   python scripts/generate_tts.py --lesson lesson-02
   ```

3. Render the video:
   ```bash
   npx remotion render LessonVideo --lesson-name=lesson-02
   ```

## ⚠️ Important Notes

1. **This content is auto-extracted**. Always review formulas, especially LaTeX expressions.
2. **Arabic text** is extracted in formal Arabic (فصحى). The Markdown generator converts to Egyptian colloquial (عامية مصرية) for video scripts.
3. **200-page book** takes approximately 2-3 hours to process end-to-end.
4. **Never** modify the extraction prompt unless you understand VLM prompt engineering.
5. **Always** back up your `raw-json/` folder — it takes the longest to regenerate.

## 🐛 Troubleshooting

### "Ollama not found"
Make sure Ollama is running: `ollama serve`

### "GPU VRAM too high"
Close other GPU-using applications (games, browsers with GPU acceleration).

### "Page failed to parse"
The VLM returned invalid JSON. Check the `raw_response` in the failed page's JSON file. Re-run with `--force` to retry.

### Crashed midway through extraction
Just re-run the same command. It will resume from where it left off.

### Poor extraction quality
- Try a larger model: `--model qwen2-vl:7b`
- Ensure the PDF page images are clear (not blurry)
- Check the DPI setting (try `--dpi 200` for better quality, but larger images)