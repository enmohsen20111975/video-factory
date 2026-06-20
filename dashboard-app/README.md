# مصنع الفيديو الموحد — لوحة التحكم (Dashboard App)

> Next.js 15 dashboard for the Unified Video Factory. Provides a unified control panel to manage books, lessons, video generation, and pipeline configuration.

---

## ✨ Features

- 📊 **Dashboard** — Overview of books, lessons, generated videos, active queue, system metrics (CPU/RAM/Disk/GPU).
- 📚 **Books Library** — Grid of book cards with upload, filter, search, delete, and extraction control (start/stop).
- 📖 **Book Detail** — Units & lessons tree view, extraction status banner, "Generate All Videos", "Export to Education".
- 📝 **Lesson Editor** — 6 tabs:
  - **Content**: Markdown editor with LaTeX support + live preview (KaTeX), summary, objectives.
  - **Images**: Drag-drop upload, grid view, edit description/type, delete.
  - **Tables**: Add/remove rows & columns, inline editing.
  - **Formulas**: KaTeX live preview, variables (symbol/meaning/unit).
  - **Questions**: 4 types (MCQ, Numerical, Conceptual, True/False) with difficulty.
  - **Video**: Script preview, generate button, video player, render log.
- 🎬 **Video Studio** — Bulk select lessons, "Generate Selected/All", active jobs panel (real-time polling), completed videos with download, log panel.
- ⚙️ **Settings** — 4 sections:
  - **VLM**: preferred model, cooldown, VRAM limit, temperature, max tokens.
  - **TTS**: voice, rate, pitch, volume.
  - **Video**: FPS, resolution, concurrency, CRF, preset.
  - **R2**: enable toggle, credentials, "Test Connection".

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (or Bun)
- Backend API running on `http://localhost:3001` (Unified Video Factory API)

### Install

```bash
cd dashboard-app
npm install
# or: bun install
```

### Develop

```bash
npm run dev
# App runs on http://localhost:3000
```

### Build

```bash
npm run build
npm start
```

### Environment Variables

Create `.env.local`:

```bash
# Backend API URL (default: http://localhost:3001)
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 🏗 Architecture

```
dashboard-app/
├── src/
│   ├── app/                          # Next.js App Router pages
│   │   ├── layout.tsx                # Root layout with RTL + dark theme + Sidebar
│   │   ├── page.tsx                  # Dashboard (/)
│   │   ├── books/
│   │   │   ├── page.tsx              # Books library (/books)
│   │   │   └── [id]/page.tsx         # Book detail (/books/[id])
│   │   ├── lessons/
│   │   │   └── [bookId]/[lessonId]/page.tsx  # Lesson editor
│   │   ├── videos/page.tsx           # Video Studio (/videos)
│   │   ├── settings/page.tsx         # Settings (/settings)
│   │   ├── globals.css               # Tailwind 4 + Cairo + KaTeX styles
│   │   ├── loading.tsx               # Loading skeleton
│   │   ├── error.tsx                 # Error boundary
│   │   └── not-found.tsx             # 404 page
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui (New York style)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── label.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── select.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── table.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── sonner.tsx            # Toast notifications
│   │   │   ├── katex.tsx             # KaTeX renderer
│   │   │   └── spinner.tsx           # Loading + EmptyState
│   │   │
│   │   ├── Sidebar.tsx               # RTL navigation sidebar
│   │   ├── Header.tsx                # Top header w/ system metrics
│   │   ├── StatsCard.tsx             # Dashboard stat card
│   │   ├── BookCard.tsx              # Book grid card
│   │   ├── UploadBookModal.tsx       # PDF upload with drag-drop
│   │   ├── StatusBadge.tsx           # Color-coded status
│   │   ├── ProgressBar.tsx           # Progress bar w/ color states
│   │   ├── LessonTree.tsx            # Units/lessons tree
│   │   ├── VideoPlayer.tsx           # Custom HTML5 video player
│   │   ├── LogPanel.tsx              # Real-time log viewer
│   │   ├── QueueList.tsx             # Active queue display
│   │   └── editor/
│   │       ├── TextEditor.tsx        # Markdown editor + preview
│   │       ├── ImageManager.tsx      # Image grid + upload
│   │       ├── TableEditor.tsx       # Editable tables
│   │       ├── FormulaEditor.tsx     # LaTeX editor + KaTeX preview
│   │       └── QuestionEditor.tsx    # 4-type question editor
│   │
│   ├── hooks/
│   │   ├── use-fetch.ts              # useFetch + usePolling
│   │   └── use-async-action.ts       # Async action with toast
│   │
│   └── lib/
│       ├── api.ts                    # API client (books, lessons, videos, pipeline)
│       ├── utils.ts                  # cn() + formatters + i18n labels
│       └── types/
│           ├── index.ts              # barrel export
│           ├── book.ts               # Book types (provided)
│           ├── lesson.ts             # Lesson types (provided)
│           ├── api.ts                # API types (provided)
│           └── video.ts              # Video config types (provided)
│
├── package.json
├── tsconfig.json
├── next.config.mjs
├── postcss.config.mjs
├── components.json                   # shadcn/ui config
├── .eslintrc.json
└── README.md
```

---

## 🎨 Design System

- **Theme**: Dark mode by default (`bg-slate-950`, `text-slate-100`)
- **Font**: Cairo (Arabic) + Inter (Latin) via `next/font/google`
- **Direction**: RTL throughout, with `dir="ltr"` escapes for code/math
- **Accent Colors**: emerald (primary), amber (warning), rose (destructive), sky (info), violet (chart)
- **Components**: shadcn/ui New York style with custom dark theme overrides
- **Icons**: Lucide React
- **Math**: KaTeX for LaTeX rendering (inline `$...$` and block `$$...$$`)

---

## 🔌 Backend API Contract

The dashboard expects the backend (`http://localhost:3001`) to expose these endpoints:

### Books
| Method | Endpoint |
|--------|----------|
| GET | `/api/books` |
| GET | `/api/books/:bookId` |
| POST | `/api/books/upload` (multipart) |
| DELETE | `/api/books/:bookId` |
| POST | `/api/books/:bookId/extract` |
| GET | `/api/books/:bookId/extract/status` |
| POST | `/api/books/:bookId/extract/stop` |
| GET | `/api/books/:bookId/logs` |

### Lessons
| Method | Endpoint |
|--------|----------|
| GET | `/api/books/:bookId/lessons/:lessonId` |
| PUT | `/api/books/:bookId/lessons/:lessonId` |
| POST | `/api/books/:bookId/lessons/:lessonId/images` (multipart) |
| DELETE | `/api/books/:bookId/lessons/:lessonId/images/:imgId` |
| POST | `/api/books/:bookId/lessons/:lessonId/review` |

### Videos
| Method | Endpoint |
|--------|----------|
| GET | `/api/videos/queue` |
| POST | `/api/videos/generate/:bookId/:lessonId` |
| POST | `/api/videos/generate-batch` |
| GET | `/api/videos/status/:bookId/:lessonId` |
| POST | `/api/videos/cancel/:bookId/:lessonId` |
| GET | `/api/videos/:bookId/:lessonId/file` |
| POST | `/api/videos/export-education` |

### Pipeline / Config
| Method | Endpoint |
|--------|----------|
| GET | `/api/config` |
| POST | `/api/config` |
| GET | `/api/system/status` |
| POST | `/api/r2/test` |

### Static Assets
- Book images: `GET /data/books/:bookId/images/:lessonId/:imgId.png`
- (Construct via `imageUrl()` in `lib/api.ts`)

---

## 📝 Notes

- This dashboard is **separate** from the main Remotion `video-factory` app.
- Backend URL is configurable via `NEXT_PUBLIC_API_URL` env var.
- Polling intervals: Queue (5s), Extraction status (3s), System metrics (10s).
- Auto-save indicator in lesson editor (manual save button, dirty state tracking).
- Toast notifications via `sonner` for all async actions.
