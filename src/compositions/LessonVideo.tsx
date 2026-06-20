import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Sequence,
  Audio,
  useVideoConfig,
  useCurrentFrame,
  delayRender,
  continueRender,
  staticFile,
} from "remotion";
import { FormulaWrite } from "../components/FormulaWrite";
import { SimulatorCinematic } from "../components/SimulatorCinematic";
import { MindMapCinematic } from "../components/MindMapCinematic";
import { QuizCinematic } from "../components/QuizCinematic";
import { ImageDisplay } from "../components/ImageDisplay";
import { TableDisplay } from "../components/TableDisplay";

// ----- Types -------------------------------------------------------------

export interface LessonVideoProps {
  /** Book identifier - used to find the lesson file */
  bookId?: string;
  /** Lesson identifier - used to find the lesson file */
  lessonId?: string;
  /**
   * Optional override of the composition duration in frames. When provided
   * by the render orchestrator, this is the sum of all `duration_sec * fps`
   * values from the lesson's scenes array.
   */
  durationInFramesOverride?: number;
}

interface TimestampWord {
  word: string;
  start: number;
  end: number;
  duration: number;
}

interface FormulaVariable {
  symbol: string;
  meaning: string;
  unit: string;
}

interface Formula {
  id: string;
  latex?: string;
  description?: string;
  variables?: FormulaVariable[];
}

interface Definition {
  id: string;
  term: string;
  definition: string;
}

interface Explanation {
  id: string;
  title: string;
  text: string;
  image_id?: string;
  order?: number;
}

interface LessonImage {
  id: string;
  source_page?: number;
  path: string;
  description: string;
  type: string;
  width?: number;
  height?: number;
}

interface LessonTable {
  id: string;
  title: string;
  headers: string[];
  rows: string[][];
}

interface Question {
  id: string;
  type: string;
  difficulty?: string;
  question: string;
  options?: string[];
  correct_index?: number;
  answer?: string;
  explanation?: string;
  formula_used?: string;
}

interface Scene {
  type: string;
  duration_sec: number;
  title?: string;
  formula_id?: string | null;
  question_ids?: string[];
  image_id?: string | null;
  table_id?: string | null;
  config?: {
    voltage?: number;
    resistance?: number;
    voltageEnd?: number;
    resistanceEnd?: number;
    animationStartFrame?: number;
    animationEndFrame?: number;
    nodes?: unknown;
    rootNode?: unknown;
    [key: string]: unknown;
  };
}

interface LessonData {
  metadata?: {
    book_id?: string;
    lesson_id?: string;
    title?: string;
    subtitle?: string;
    subject?: string;
    grade?: string;
  };
  content?: {
    raw_text?: string;
    summary?: string;
    objectives?: string[];
    definitions?: Definition[];
    formulas?: Formula[];
    explanations?: Explanation[];
  };
  images?: LessonImage[];
  tables?: LessonTable[];
  questions?: Question[];
  scenes?: Scene[];
  video?: {
    status?: string;
    script_text?: string;
    voice?: string;
    video_url?: string | null;
    duration_sec?: number;
  };
}

// ----- Helper functions --------------------------------------------------

const FALLBACK_LESSON: LessonData = {
  metadata: {
    title: "قانون أوم",
    subtitle: "العلاقة بين الجهد والتيار والمقاومة",
    subject: "physics",
    grade: "3rd-secondary",
  },
  content: {
    summary:
      "يشرح هذا الدرس العلاقة بين الجهد الكهربي وشدة التيار والمقاومة الكهربية عبر قانون أوم.",
    definitions: [],
    formulas: [
      {
        id: "form-001",
        latex: "V = I \\times R",
        description: "قانون أوم الأساسي",
        variables: [
          { symbol: "V", meaning: "الجهد الكهربي", unit: "فولت (V)" },
          { symbol: "I", meaning: "شدة التيار", unit: "أمبير (A)" },
          { symbol: "R", meaning: "المقاومة الكهربية", unit: "أوم (Ω)" },
        ],
      },
    ],
    explanations: [],
  },
  images: [],
  tables: [],
  questions: [
    {
      id: "q-001",
      type: "mcq",
      question: "مقاومة 5 أوم موصلة ببطارية 10 فولت. احسب التيار الناتج.",
      options: ["0.5 أمبير", "1 أمبير", "2 أمبير", "5 أمبير"],
      correct_index: 2,
      explanation: "I = V ÷ R = 10 ÷ 5 = 2 أمبير",
    },
  ],
  scenes: [
    { type: "intro", duration_sec: 4, title: "المقدمة" },
    { type: "title", duration_sec: 8, title: "عنوان الدرس" },
    { type: "formula", duration_sec: 12, formula_id: "form-001" },
    {
      type: "simulator",
      duration_sec: 16,
      config: { voltage: 9, resistance: 3, voltageEnd: 15, resistanceEnd: 3 },
    },
    { type: "mindmap", duration_sec: 15 },
    { type: "quiz", duration_sec: 15, question_ids: ["q-001"] },
    { type: "outro", duration_sec: 5 },
  ],
  video: {
    status: "not_generated",
    voice: "ar-EG-SalmaNeural",
  },
};

// ----- Component ---------------------------------------------------------

export const LessonVideo: React.FC<LessonVideoProps> = ({
  bookId = "ohm-law",
  lessonId = "ohm-law",
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const [timestamps, setTimestamps] = useState<TimestampWord[]>([]);
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [handle] = useState(() => delayRender("Loading lesson + timestamps"));

  useEffect(() => {
    // Active lesson + timestamps files are placed into the public/ folder
    // by the render orchestrator (scripts/render-video.js) right before the
    // render begins.  Falls back gracefully if they are missing (e.g. when
    // previewing the studio without a lesson loaded).
    let pending = 2;

    const done = () => {
      pending -= 1;
      if (pending <= 0) continueRender(handle);
    };

    fetch(staticFile("active-lesson.json"))
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: LessonData) => {
        setLesson(data);
        done();
      })
      .catch((err) => {
        console.warn(
          "[LessonVideo] Could not load /active-lesson.json, using fallback:",
          err,
        );
        done();
      });

    fetch(staticFile("active-timestamps.json"))
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: TimestampWord[]) => {
        setTimestamps(data || []);
        done();
      })
      .catch((err) => {
        console.warn(
          "[LessonVideo] Could not load /active-timestamps.json, using empty fallback:",
          err,
        );
        done();
      });
  }, [bookId, lessonId, handle]);

  const data: LessonData = lesson ?? FALLBACK_LESSON;
  const scenes = data.scenes ?? FALLBACK_LESSON.scenes!;

  // Pre-compute the cumulative frame offset for each scene so the scene
  // sequence lines up with the audio timeline.
  let cursor = 0;
  const sceneFrames = scenes.map((scene) => {
    const frames = Math.max(1, Math.round((scene.duration_sec ?? 0) * fps));
    const from = cursor;
    cursor += frames;
    return { scene, from, frames };
  });

  // ---- Subtitles --------------------------------------------------------
  const renderSubtitles = (currentFrame: number) => {
    if (!timestamps.length) return null;
    const currentTime = currentFrame / fps;

    const activeWordIndex = timestamps.findIndex(
      (t) => currentTime >= t.start && currentTime <= t.end,
    );
    if (activeWordIndex === -1) return null;

    const startIdx = Math.max(0, activeWordIndex - 2);
    const endIdx = Math.min(timestamps.length, activeWordIndex + 3);
    const visibleWords = timestamps.slice(startIdx, endIdx);

    return (
      <div
        style={{
          position: "absolute",
          bottom: "50px",
          display: "flex",
          justifyContent: "center",
          width: "100%",
          gap: "10px",
          fontFamily: "'Cairo', sans-serif",
          fontSize: "28px",
          fontWeight: 700,
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(5px)",
          padding: "10px 30px",
          borderRadius: "20px",
          border: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        {visibleWords.map((w, index) => {
          const isActive = w.word === timestamps[activeWordIndex].word;
          return (
            <span
              key={index}
              style={{
                color: isActive ? "#F59E0B" : "#94A3B8",
                transform: isActive ? "scale(1.15)" : "scale(1.0)",
                textShadow: isActive
                  ? "0 0 10px rgba(245, 158, 11, 0.4)"
                  : "none",
                transition: "all 0.15s ease-out",
              }}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    );
  };

  // ---- Renderers for each scene type -----------------------------------
  const findFormula = (id?: string | null): Formula | undefined => {
    if (!id) return undefined;
    return data.content?.formulas?.find((f) => f.id === id);
  };

  const findQuestion = (ids?: string[]): Question | undefined => {
    if (!ids || ids.length === 0) return undefined;
    const qid = ids[0];
    return data.questions?.find((q) => q.id === qid);
  };

  const findImage = (id?: string | null): LessonImage | undefined => {
    if (!id) return undefined;
    return data.images?.find((i) => i.id === id);
  };

  const findTable = (id?: string | null): LessonTable | undefined => {
    if (!id) return undefined;
    return data.tables?.find((t) => t.id === id);
  };

  const renderScene = (scene: Scene) => {
    switch (scene.type) {
      case "intro":
        return (
          <AbsoluteFill
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <h2
                style={{
                  fontSize: "28px",
                  color: "#6366F1",
                  fontWeight: 600,
                  letterSpacing: "1px",
                  marginBottom: "10px",
                }}
              >
                💡 SMART EDUCATION
              </h2>
              <div
                style={{
                  width: "60px",
                  height: "3px",
                  background:
                    "linear-gradient(to right, #6366F1, #A855F7)",
                  margin: "0 auto",
                }}
              />
            </div>
          </AbsoluteFill>
        );

      case "title": {
        const title =
          scene.title || data.metadata?.title || "قانون أوم وتطبيقاته";
        const topic =
          data.metadata?.subtitle ||
          data.metadata?.subject ||
          "الفيزياء الكهربية - تالتة ثانوي";
        return (
          <AbsoluteFill
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  fontSize: "20px",
                  color: "#A855F7",
                  fontWeight: 600,
                  marginBottom: "10px",
                }}
              >
                {topic}
              </p>
              <h1
                style={{
                  fontSize: "56px",
                  fontWeight: 800,
                  background:
                    "linear-gradient(to right, #F8FAFC, #94A3B8)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  margin: "10px 0",
                }}
              >
                {title}
              </h1>
            </div>
          </AbsoluteFill>
        );
      }

      case "formula": {
        const formula = findFormula(scene.formula_id);
        return (
          <AbsoluteFill
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            <FormulaWrite formula={formula} />
          </AbsoluteFill>
        );
      }

      case "simulator": {
        const cfg = scene.config || {};
        return (
          <AbsoluteFill
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            <SimulatorCinematic
              voltage={cfg.voltage}
              resistance={cfg.resistance}
              voltageEnd={cfg.voltageEnd}
              resistanceEnd={cfg.resistanceEnd}
              animationStartFrame={cfg.animationStartFrame}
              animationEndFrame={cfg.animationEndFrame}
            />
          </AbsoluteFill>
        );
      }

      case "mindmap": {
        const cfg = scene.config || {};
        return (
          <AbsoluteFill
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            <MindMapCinematic
              nodes={
                Array.isArray(cfg.nodes) ? (cfg.nodes as never[]) : undefined
              }
              rootNode={
                cfg.rootNode && typeof cfg.rootNode === "object"
                  ? (cfg.rootNode as never)
                  : undefined
              }
            />
          </AbsoluteFill>
        );
      }

      case "quiz": {
        const q = findQuestion(scene.question_ids);
        const cfg = scene.config || {};
        return (
          <AbsoluteFill
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            <QuizCinematic
              question={q}
              questionText={q?.question}
              options={q?.options}
              correctIndex={q?.correct_index}
              explanation={q?.explanation}
              timerStartFrame={
                typeof cfg.timerStartFrame === "number"
                  ? cfg.timerStartFrame
                  : undefined
              }
              timerDuration={
                typeof cfg.timerDuration === "number"
                  ? cfg.timerDuration
                  : undefined
              }
            />
          </AbsoluteFill>
        );
      }

      case "image": {
        const img = findImage(scene.image_id);
        if (!img) return null;
        return (
          <AbsoluteFill
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            <ImageDisplay
              imagePath={img.path}
              description={img.description}
              title={scene.title}
            />
          </AbsoluteFill>
        );
      }

      case "table": {
        const tbl = findTable(scene.table_id);
        if (!tbl) return null;
        return (
          <AbsoluteFill
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            <TableDisplay table={tbl} />
          </AbsoluteFill>
        );
      }

      case "outro":
        return (
          <AbsoluteFill
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <h2
                style={{
                  fontSize: "36px",
                  fontWeight: 800,
                  background:
                    "linear-gradient(to right, #6366F1, #A855F7)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                شكراً لكم على المتابعة
              </h2>
              <p
                style={{
                  fontSize: "18px",
                  color: "#94A3B8",
                  marginTop: "15px",
                }}
              >
                اشترك في المنصة لمشاهدة المزيد من الدروس التفاعلية
              </p>
            </div>
          </AbsoluteFill>
        );

      default:
        return null;
    }
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0B0F19",
        color: "#F8FAFC",
        fontFamily: "'Cairo', 'Inter', sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Animated subtle grid background */}
      <div
        style={{
          position: "absolute",
          width: "200%",
          height: "200%",
          backgroundImage:
            "radial-gradient(circle, rgba(99, 102, 241, 0.08) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
          top: "-50%",
          left: "-50%",
          transform: "rotate(5deg)",
          zIndex: 0,
        }}
      />

      {/* Dynamic voiceover audio - placed into /public by render script */}
      <Audio src={staticFile("active-voiceover.mp3")} volume={1.0} />

      {/* Dynamic scene sequences driven by the lesson's scenes array */}
      {sceneFrames.map(({ scene, from, frames }, idx) => (
        <Sequence key={idx} from={from} durationInFrames={frames}>
          {renderScene(scene)}
        </Sequence>
      ))}

      {/* Synchronized subtitles overlay */}
      {renderSubtitles(frame)}
    </AbsoluteFill>
  );
};
