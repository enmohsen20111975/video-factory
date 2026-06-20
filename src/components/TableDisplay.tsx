import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

export interface TableData {
  id?: string;
  title?: string;
  headers: string[];
  rows: string[][];
}

interface TableDisplayProps {
  /** Table object from lesson.json (`tables[i]`). */
  table?: TableData;
  /** Optional heading above the table (defaults to `table.title`). */
  title?: string;
}

export const TableDisplay: React.FC<TableDisplayProps> = ({ table, title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headers = table?.headers ?? [];
  const rows = table?.rows ?? [];
  const heading = title ?? table?.title ?? "جدول";

  const containerSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 110 },
  });

  const headerSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  const rowSpring = (rowIndex: number) =>
    spring({
      frame: frame - 18 - rowIndex * 4,
      fps,
      config: { damping: 14, stiffness: 120 },
    });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        padding: "30px",
        borderRadius: "24px",
        background: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 20px 45px rgba(0,0,0,0.4)",
        width: "100%",
        maxWidth: "820px",
        fontFamily: "'Cairo', sans-serif",
        color: "#F8FAFC",
        transform: `scale(${containerSpring})`,
      }}
    >
      <div style={{ fontSize: "22px", fontWeight: 700, color: "#A855F7" }}>{heading}</div>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          background: "rgba(30, 41, 59, 0.6)",
          borderRadius: "12px",
          overflow: "hidden",
          fontSize: "18px",
        }}
      >
        <thead>
          <tr
            style={{
              background: "linear-gradient(90deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.25))",
              opacity: headerSpring,
              transform: `translateY(${(1 - headerSpring) * 10}px)`,
            }}
          >
            {headers.map((h, i) => (
              <th
                key={i}
                style={{
                  padding: "14px 18px",
                  textAlign: "center",
                  fontWeight: 700,
                  color: "#E0E7FF",
                  borderBottom: "2px solid rgba(255,255,255,0.08)",
                  borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => {
            const sp = rowSpring(rIdx);
            return (
              <tr
                key={rIdx}
                style={{
                  opacity: sp,
                  transform: `translateY(${(1 - sp) * 10}px)`,
                  background: rIdx % 2 === 0 ? "rgba(15, 23, 42, 0.4)" : "rgba(15, 23, 42, 0.6)",
                }}
              >
                {row.map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    style={{
                      padding: "12px 18px",
                      textAlign: "center",
                      color: "#E2E8F0",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      borderLeft: cIdx > 0 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
