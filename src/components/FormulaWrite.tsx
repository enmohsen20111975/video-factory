import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

export interface FormulaVariable {
  symbol: string;
  meaning: string;
  unit: string;
}

export interface FormulaData {
  id?: string;
  latex?: string;
  description?: string;
  variables?: FormulaVariable[];
}

interface FormulaWriteProps {
  /** Formula data coming from lesson.json (`content.formulas[i]`). Falls back
   * to the hardcoded Ohm's law formula when nothing is provided. */
  formula?: FormulaData;
  /** Optional override of the displayed formula string (e.g. "V = I × R"). */
  formulaText?: string;
  /** active variable index to highlight (-1 = none) */
  highlightIndex?: number;
}

interface FormulaToken {
  text: string;
  /** CSS color */
  color: string;
  /** human readable label shown under the symbol */
  label: string;
  /** glow color */
  glow: string;
  /** whether this token is a "real" variable (vs operator/=) */
  isVariable: boolean;
}

// Map of common physics symbols to a stable colour + label so any simple
// LaTeX formula renders with consistent styling.
const SYMBOL_COLORS: Record<string, { color: string; label: string; glow: string }> = {
  V: { color: "#3B82F6", label: "الجهد (Volt)", glow: "rgba(59, 130, 246, 0.4)" },
  I: { color: "#EF4444", label: "التيار (Ampere)", glow: "rgba(239, 68, 68, 0.4)" },
  R: { color: "#10B981", label: "المقاومة (Ohm)", glow: "rgba(16, 185, 129, 0.4)" },
  P: { color: "#A855F7", label: "القدرة (Watt)", glow: "rgba(168, 85, 247, 0.4)" },
  Q: { color: "#F59E0B", label: "الشحنة (Coulomb)", glow: "rgba(245, 158, 11, 0.4)" },
  E: { color: "#06B6D4", label: "الطاقة (Joule)", glow: "rgba(6, 182, 212, 0.4)" },
  F: { color: "#EC4899", label: "القوة (Newton)", glow: "rgba(236, 72, 153, 0.4)" },
  W: { color: "#14B8A6", label: "الشغل (Joule)", glow: "rgba(20, 184, 166, 0.4)" },
};

const DEFAULT_TOKENS: FormulaToken[] = [
  { text: "V", color: "#3B82F6", label: "الجهد (Volt)", glow: "rgba(59, 130, 246, 0.4)", isVariable: true },
  { text: "=", color: "#F8FAFC", label: "", glow: "", isVariable: false },
  { text: "I", color: "#EF4444", label: "التيار (Ampere)", glow: "rgba(239, 68, 68, 0.4)", isVariable: true },
  { text: "×", color: "#F8FAFC", label: "", glow: "", isVariable: false },
  { text: "R", color: "#10B981", label: "المقاومة (Ohm)", glow: "rgba(16, 185, 129, 0.4)", isVariable: true },
];

// Light LaTeX-ish parser: splits "V = I \\times R" / "V = I × R" / "I = V/R"
// into tokens that we can colour & animate individually.
function parseFormula(latex: string): FormulaToken[] {
  if (!latex) return DEFAULT_TOKENS;
  const cleaned = latex
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\cdot/g, "·")
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)")
    .replace(/\\\s+/g, " ");

  // Split on whitespace but keep operators and standalone letters/numbers.
  const rawTokens = cleaned.match(/([A-Za-zα-ωΑ-Ω][0-9]?|[0-9]+(\.[0-9]+)?|[=+\-×÷·/()^]|\\[a-zA-Z]+)/g) ?? [];
  const tokens: FormulaToken[] = [];
  const usedLabels = new Set<string>();

  for (const raw of rawTokens) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (/^[=+\-×÷·/()^]$/.test(trimmed)) {
      tokens.push({ text: trimmed, color: "#F8FAFC", label: "", glow: "", isVariable: false });
    } else {
      const sym = SYMBOL_COLORS[trimmed[0]] ?? SYMBOL_COLORS[trimmed] ?? {
        color: "#A855F7",
        label: "",
        glow: "rgba(168, 85, 247, 0.4)",
      };
      if (sym.label && !usedLabels.has(sym.label)) {
        usedLabels.add(sym.label);
      }
      tokens.push({ text: trimmed, color: sym.color, label: sym.label, glow: sym.glow, isVariable: true });
    }
  }

  return tokens.length > 0 ? tokens : DEFAULT_TOKENS;
}

export const FormulaWrite: React.FC<FormulaWriteProps> = ({
  formula,
  formulaText,
  highlightIndex = -1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Resolve tokens to render
  const explicitText = formulaText ?? formula?.latex;
  const elements: FormulaToken[] = explicitText ? parseFormula(explicitText) : DEFAULT_TOKENS;

  // Variables defined in the lesson (for richer labels under the formula)
  const lessonVariables = formula?.variables ?? [];
  const getLabel = (el: FormulaToken): string => {
    if (el.label) return el.label;
    const v = lessonVariables.find((vv) => vv.symbol === el.text);
    if (v) return `${v.meaning} (${v.unit})`;
    return "";
  };

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
        maxWidth: "640px",
        width: "100%",
        fontFamily: "'Cairo', 'Inter', sans-serif",
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: "20px",
          color: "#94A3B8",
          marginBottom: "24px",
          fontWeight: 600,
          letterSpacing: "0.5px",
        }}
      >
        {formula?.description ?? "الصيغة الرياضية"}
      </div>

      {/* Formula Symbols Row */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {elements.map((el, index) => {
          const delay = index * 6;
          const springScale = spring({
            frame: frame - delay,
            fps,
            config: { damping: 12, stiffness: 100 },
          });

          const isHighlighted = highlightIndex === index || (el.isVariable && highlightIndex === -1);
          const shadowStyle =
            isHighlighted && el.glow
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
                ...shadowStyle,
              }}
            >
              {el.text}
            </div>
          );
        })}
      </div>

      {/* Variable labels */}
      <div
        style={{
          minHeight: "40px",
          display: "flex",
          gap: "30px",
          marginTop: "16px",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {elements.map((el, index) => {
          const label = getLabel(el);
          if (!label) return null;
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
                transform: `translateY(${Math.max(0, 15 - (frame - delay))}px)`,
              }}
            >
              <span style={{ fontSize: "14px", color: "#64748B" }}>{el.text}</span>
              <span style={{ fontSize: "16px", fontWeight: 600, color: el.color }}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
