import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export interface QuizQuestion {
  id?: string;
  type?: string;
  difficulty?: string;
  question?: string;
  options?: string[];
  correct_index?: number;
  answer?: string;
  explanation?: string;
  formula_used?: string;
}

interface QuizCinematicProps {
  /** Question object from lesson.json (or equivalent). Falls back to a
   * sample Ohm's law question when nothing is supplied. */
  question?: QuizQuestion;
  /** Inline question string - overrides `question.question` */
  questionText?: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  timerStartFrame?: number;
  timerDuration?: number;
}

const DEFAULT_QUESTION: QuizQuestion = {
  id: "q-default",
  type: "mcq",
  question: "سؤال: مقاومة 6 أوم موصلة ببطارية 12 فولت. احسب التيار الناتج؟",
  options: ["1 أمبير", "2 أمبير", "3 أمبير", "4 أمبير"],
  correct_index: 1,
  explanation: "الحل: طبق قانون أوم I = V ÷ R => I = 12 ÷ 6 = 2 أمبير",
};

export const QuizCinematic: React.FC<QuizCinematicProps> = ({
  question,
  questionText,
  options,
  correctIndex,
  explanation,
  timerStartFrame = 30,
  timerDuration = 90,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const q = question ?? DEFAULT_QUESTION;
  const qText = questionText ?? q.question ?? DEFAULT_QUESTION.question!;
  const qOptions = options ?? q.options ?? DEFAULT_QUESTION.options!;
  const qCorrect = correctIndex ?? q.correct_index ?? DEFAULT_QUESTION.correct_index!;
  const qExplanation = explanation ?? q.explanation ?? DEFAULT_QUESTION.explanation!;

  const timerProgress = interpolate(
    frame,
    [timerStartFrame, timerStartFrame + timerDuration],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const isTimerFinished = frame >= timerStartFrame + timerDuration;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "35px",
        borderRadius: "24px",
        background: "rgba(30, 41, 59, 0.7)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        width: "100%",
        maxWidth: "680px",
        fontFamily: "'Cairo', sans-serif",
        boxShadow: "0 20px 45px rgba(0,0,0,0.3)",
      }}
    >
      <div style={{ fontSize: "16px", fontWeight: 600, color: "#F59E0B", marginBottom: "10px" }}>
        🧠 اختبر فهمك الآن!
      </div>

      <div
        style={{
          fontSize: "24px",
          fontWeight: 700,
          color: "#F8FAFC",
          textAlign: "center",
          marginBottom: "25px",
          lineHeight: "1.6",
        }}
      >
        {qText}
      </div>

      {/* Timer Bar */}
      <div
        style={{
          width: "100%",
          height: "8px",
          background: "#334155",
          borderRadius: "4px",
          overflow: "hidden",
          marginBottom: "30px",
          position: "relative",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${timerProgress * 100}%`,
            background: timerProgress > 0.3 ? "#3B82F6" : "#EF4444",
            transition: "width 0.1s linear, background-color 0.3s ease",
          }}
        />
      </div>

      {/* Options */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "15px",
          width: "100%",
          marginBottom: "20px",
        }}
      >
        {qOptions.map((opt, index) => {
          const delay = 10 + index * 6;
          const scale = spring({
            frame: frame - delay,
            fps,
            config: { damping: 12, stiffness: 100 },
          });
          if (scale <= 0) return null;

          let border = "1px solid rgba(255, 255, 255, 0.1)";
          let bg = "rgba(15, 23, 42, 0.4)";
          let shadow = "";
          let opacity = 1;

          if (isTimerFinished) {
            if (index === qCorrect) {
              border = "2px solid #10B981";
              bg = "rgba(16, 185, 129, 0.15)";
              shadow = "0 0 15px rgba(16, 185, 129, 0.2)";
            } else {
              border = "1px solid rgba(239, 68, 68, 0.2)";
              bg = "rgba(239, 68, 68, 0.05)";
              opacity = 0.5;
            }
          }

          return (
            <div
              key={index}
              style={{
                padding: "15px 20px",
                borderRadius: "12px",
                border,
                background: bg,
                color: isTimerFinished && index === qCorrect ? "#10B981" : "#E2E8F0",
                fontSize: "18px",
                fontWeight: 600,
                textAlign: "center",
                transform: `scale(${scale})`,
                boxShadow: shadow,
                opacity,
                transition: "all 0.4s ease",
              }}
            >
              {opt}
            </div>
          );
        })}
      </div>

      {/* Explanation (fades in after timer finishes) */}
      {isTimerFinished && (
        <div
          style={{
            width: "100%",
            padding: "15px",
            background: "rgba(16, 185, 129, 0.08)",
            border: "1px dashed rgba(16, 185, 129, 0.3)",
            borderRadius: "12px",
            color: "#6EE7B7",
            fontSize: "15px",
            textAlign: "center",
            marginTop: "10px",
            animation: "fadeIn 0.5s ease-in-out",
          }}
        >
          {qExplanation}
        </div>
      )}
    </div>
  );
};
