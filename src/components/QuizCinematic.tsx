import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface QuizCinematicProps {
  question?: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  timerStartFrame?: number;
  timerDuration?: number; // duration of the timer countdown in frames
}

export const QuizCinematic: React.FC<QuizCinematicProps> = ({
  question = "سؤال: مقاومة 6 أوم موصلة ببطارية 12 فولت. احسب التيار الناتج؟",
  options = ["1 أمبير", "2 أمبير", "3 أمبير", "4 أمبير"],
  correctIndex = 1, // "2 أمبير"
  explanation = "الحل: طبق قانون أوم I = V ÷ R => I = 12 ÷ 6 = 2 أمبير",
  timerStartFrame = 30,
  timerDuration = 90 // 3 seconds at 30fps
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timer animation
  const timerProgress = interpolate(
    frame,
    [timerStartFrame, timerStartFrame + timerDuration],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
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
        boxShadow: "0 20px 45px rgba(0,0,0,0.3)"
      }}
    >
      <div style={{ fontSize: "16px", fontWeight: 600, color: "#F59E0B", marginBottom: "10px" }}>
        🧠 اختبر فهمك الآن!
      </div>

      {/* Question */}
      <div
        style={{
          fontSize: "24px",
          fontWeight: 700,
          color: "#F8FAFC",
          textAlign: "center",
          marginBottom: "25px",
          lineHeight: "1.6"
        }}
      >
        {question}
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
          position: "relative"
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${timerProgress * 100}%`,
            background: timerProgress > 0.3 ? "#3B82F6" : "#EF4444",
            transition: "width 0.1s linear, background-color 0.3s ease"
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
          marginBottom: "20px"
        }}
      >
        {options.map((opt, index) => {
          const delay = 10 + index * 6;
          const scale = spring({
            frame: frame - delay,
            fps,
            config: { damping: 12, stiffness: 100 }
          });

          if (scale <= 0) return null;

          // styling options based on timing & correctness
          let border = "1px solid rgba(255, 255, 255, 0.1)";
          let bg = "rgba(15, 23, 42, 0.4)";
          let shadow = "";

          if (isTimerFinished) {
            if (index === correctIndex) {
              border = "2px solid #10B981";
              bg = "rgba(16, 185, 129, 0.15)";
              shadow = "0 0 15px rgba(16, 185, 129, 0.2)";
            } else {
              border = "1px solid rgba(239, 68, 68, 0.2)";
              bg = "rgba(239, 68, 68, 0.05)";
              opacity: 0.5;
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
                color: isTimerFinished && index === correctIndex ? "#10B981" : "#E2E8F0",
                fontSize: "18px",
                fontWeight: 600,
                textAlign: "center",
                transform: `scale(${scale})`,
                boxShadow: shadow,
                transition: "all 0.4s ease"
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
            animation: "fadeIn 0.5s ease-in-out"
          }}
        >
          {explanation}
        </div>
      )}
    </div>
  );
};
