import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

export interface MindMapNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
}

interface MindMapCinematicProps {
  /** Branch nodes - falls back to Ohm's law defaults when omitted. */
  nodes?: MindMapNode[];
  /** Root node - falls back to "قانون أوم" when omitted. */
  rootNode?: MindMapNode;
  /** Optional heading above the diagram. */
  title?: string;
}

const DEFAULT_ROOT: MindMapNode = { id: "root", label: "قانون أوم", x: 200, y: 150, color: "#F59E0B" };

const DEFAULT_BRANCHES: MindMapNode[] = [
  { id: "b1", label: "الجهد V\n(طردي)", x: 80, y: 80, color: "#3B82F6" },
  { id: "b2", label: "المقاومة R\n(عكسي)", x: 80, y: 220, color: "#10B981" },
  { id: "b3", label: "الصيغة\nV = I × R", x: 320, y: 150, color: "#EF4444" },
];

export const MindMapCinematic: React.FC<MindMapCinematicProps> = ({
  nodes,
  rootNode,
  title,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const root = rootNode ?? DEFAULT_ROOT;
  const branches = nodes && nodes.length > 0 ? nodes : DEFAULT_BRANCHES;

  const getScale = (delay: number) =>
    spring({ frame: frame - delay, fps, config: { damping: 10, stiffness: 120 } });

  const getLineProgress = (delay: number) => {
    const startFrame = delay;
    const duration = 15;
    return Math.min(1, Math.max(0, frame - startFrame) / duration);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px",
        borderRadius: "24px",
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        width: "100%",
        maxWidth: "700px",
        fontFamily: "'Cairo', sans-serif",
      }}
    >
      <div style={{ fontSize: "20px", fontWeight: 700, color: "#94A3B8", marginBottom: "20px" }}>
        {title ?? "🧠 خريطة ذهنية سريعة للدرس"}
      </div>

      <div style={{ width: "100%", position: "relative", minHeight: "300px" }}>
        <svg viewBox="0 0 400 300" style={{ width: "100%", height: "100%" }}>
          {/* Connection Lines */}
          {branches.map((b, index) => {
            const delay = 10 + index * 10;
            const progress = getLineProgress(delay);
            const lineX = root.x + (b.x - root.x) * progress;
            const lineY = root.y + (b.y - root.y) * progress;
            return (
              <line
                key={`line-${b.id}`}
                x1={root.x}
                y1={root.y}
                x2={lineX}
                y2={lineY}
                stroke={b.color}
                strokeWidth="3"
                strokeDasharray="5,5"
                opacity={progress}
              />
            );
          })}

          {/* Root node */}
          <g transform={`translate(${root.x}, ${root.y})`}>
            <circle
              r="40"
              fill="rgba(245, 158, 11, 0.15)"
              stroke="rgba(245, 158, 11, 0.3)"
              strokeWidth="2"
              style={{
                transform: `scale(${1 + Math.sin(frame / 5) * 0.08})`,
                transformOrigin: "center",
              }}
            />
            <circle
              r="35"
              fill={root.color}
              style={{ filter: `drop-shadow(0 0 10px ${root.color}66)` }}
            />
            <text y="5" textAnchor="middle" fill="#0F172A" fontSize="16" fontWeight="bold">
              {root.label}
            </text>
          </g>

          {/* Branch nodes */}
          {branches.map((b, index) => {
            const delay = 25 + index * 12;
            const scale = getScale(delay);
            if (scale <= 0) return null;
            const lines = b.label.split("\n");
            return (
              <g
                key={b.id}
                transform={`translate(${b.x}, ${b.y}) scale(${scale})`}
                style={{ transformOrigin: `${b.x}px ${b.y}px` }}
              >
                <rect
                  x="-60"
                  y="-25"
                  width="120"
                  height="50"
                  rx="10"
                  fill="#1E293B"
                  stroke={b.color}
                  strokeWidth="2"
                  style={{ filter: "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))" }}
                />
                {lines.map((line, idx) => (
                  <text
                    key={idx}
                    x="0"
                    y={lines.length > 1 ? (idx === 0 ? "-2" : "15") : "6"}
                    textAnchor="middle"
                    fill="#F8FAFC"
                    fontSize="12"
                    fontWeight="600"
                  >
                    {line}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
