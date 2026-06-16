import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

interface FormulaWriteProps {
  formula?: string; // e.g. "V = I * R"
  highlightIndex?: number; // active variable index to highlight
}

export const FormulaWrite: React.FC<FormulaWriteProps> = ({
  formula = "V = I × R",
  highlightIndex = -1
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Split formula into elements for custom styling
  // V = I × R
  const elements = [
    { text: "V", color: "#3B82F6", label: "الجهد (Volt)", glow: "rgba(59, 130, 246, 0.4)" },
    { text: "=", color: "#F8FAFC", label: "", glow: "" },
    { text: "I", color: "#EF4444", label: "التيار (Ampere)", glow: "rgba(239, 68, 68, 0.4)" },
    { text: "×", color: "#F8FAFC", label: "", glow: "" },
    { text: "R", color: "#10B981", label: "المقاومة (Ohm)", glow: "rgba(16, 185, 129, 0.4)" }
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px",
        borderRadius: "24px",
        background: "rgba(30, 41, 59, 0.7)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
        maxWidth: "600px",
        width: "100%",
        fontFamily: "'Cairo', 'Inter', sans-serif"
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: "20px",
          color: "#94A3B8",
          marginBottom: "24px",
          fontWeight: 600,
          letterSpacing: "0.5px"
        }}
      >
        الصيغة الرياضية لقانون أوم
      </div>

      {/* Formula Symbols Row */}
      <div style={{ display: "flex", gap: "20px", alignItems: "center", marginBottom: "20px" }}>
        {elements.map((el, index) => {
          // Delay each symbol's appearance by 5 frames
          const delay = index * 6;
          const springScale = spring({
            frame: frame - delay,
            fps,
            config: { damping: 12, stiffness: 100 }
          });

          // Highlight effect
          const isHighlighted = highlightIndex === index || (el.label && highlightIndex === -1);
          const shadowStyle = isHighlighted && el.glow
            ? { textShadow: `0 0 20px ${el.glow}, 0 0 40px ${el.glow}` }
            : {};

          return (
            <div
              key={index}
              style={{
                fontSize: "72px",
                fontWeight: 800,
                color: el.color,
                transform: `scale(${springScale})`,
                opacity: Math.min(1, Math.max(0, frame - delay) / 10),
                transition: "all 0.3s ease",
                ...shadowStyle
              }}
            >
              {el.text}
            </div>
          );
        })}
      </div>

      {/* Subtitles / Explanation for active element */}
      <div
        style={{
          minHeight: "40px",
          display: "flex",
          gap: "30px",
          marginTop: "16px",
          justifyContent: "center"
        }}
      >
        {elements.map((el, index) => {
          if (!el.label) return null;
          const delay = 30 + index * 6;
          const opacity = Math.min(1, Math.max(0, frame - delay) / 15);
          
          return (
            <div
              key={index}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                opacity,
                transform: `translateY(${Math.max(0, 15 - (frame - delay)) }px)`
              }}
            >
              <span style={{ fontSize: "14px", color: "#64748B" }}>{el.text}</span>
              <span style={{ fontSize: "16px", fontWeight: 600, color: el.color }}>
                {el.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
