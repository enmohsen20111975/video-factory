import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface InfographicCinematicProps {
  title?: string;
  points?: string[];
}

export const InfographicCinematic: React.FC<InfographicCinematicProps> = ({
  title = "حقائق سريعة",
  points = [
    "قانون أوم هو الأساس في الدوائر الكهربائية",
    "يطبق على الموصلات الخطية فقط",
    "المقاومة تُقاس بالأوم (Ω)",
  ]
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pointScale = (index: number) => {
    const delay = 15 + index * 8;
    return spring({
      frame: frame - delay,
      fps,
      config: { damping: 12, stiffness: 100 }
    });
  };

  const iconGlow = (index: number) => {
    const delay = 15 + index * 8;
    return interpolate(
      frame - delay,
      [0, 15, 30],
      [0, 0.8, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  };

  const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#A855F7"];

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
        maxWidth: "700px",
        fontFamily: "'Cairo', sans-serif"
      }}
    >
      <div style={{ fontSize: "22px", fontWeight: 700, color: "#F8FAFC", marginBottom: "25px" }}>
        📊 {title}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
        {points.map((point, index) => {
          const scale = pointScale(index);
          if (scale <= 0) return null;

          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "15px",
                transform: `scale(${scale})`,
                opacity: Math.min(1, scale),
              }}
            >
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${colors[index % colors.length]}, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: `0 0 ${iconGlow(index) * 30}px ${colors[index % colors.length]}`
                }}
              >
                <span style={{ fontSize: "24px" }}>
                  {index === 0 ? "📌" : index === 1 ? "🔧" : index === 2 ? "⚡" : "📈"}
                </span>
              </div>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "#E2E8F0",
                  lineHeight: "1.6"
                }}
              >
                {point}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};