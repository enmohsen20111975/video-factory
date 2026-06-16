import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

interface SimulatorCinematicProps {
  voltage?: number;
  resistance?: number;
  voltageEnd?: number;
  resistanceEnd?: number;
  animationStartFrame?: number;
  animationEndFrame?: number;
}

export const SimulatorCinematic: React.FC<SimulatorCinematicProps> = ({
  voltage = 9,
  resistance = 3,
  voltageEnd = 12,
  resistanceEnd = 3,
  animationStartFrame = 30,
  animationEndFrame = 120
}) => {
  const frame = useCurrentFrame();

  // Interpolate voltage and resistance over time
  const currentVoltage = interpolate(
    frame,
    [animationStartFrame, animationEndFrame],
    [voltage, voltageEnd],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const currentResistance = interpolate(
    frame,
    [animationStartFrame, animationEndFrame],
    [resistance, resistanceEnd],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const currentI = currentVoltage / currentResistance;

  // We can animate wire flow speed based on current
  // Flow offset = frame * speed. Speed depends on current I.
  // Lower resistance / higher voltage = higher current = faster speed.
  const baseSpeed = 2;
  const currentSpeed = currentI * baseSpeed;
  const flowOffset = frame * currentSpeed;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px",
        borderRadius: "24px",
        background: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 20px 45px rgba(0, 0, 0, 0.4)",
        width: "100%",
        maxWidth: "800px",
        fontFamily: "'Cairo', 'Inter', sans-serif",
        color: "#F8FAFC"
      }}
    >
      <div style={{ fontSize: "22px", fontWeight: 700, marginBottom: "20px", color: "#F8FAFC" }}>
        🔌 محاكي الدائرة الكهربية الافتراضية
      </div>

      <div style={{ display: "flex", width: "100%", gap: "30px", alignItems: "center" }}>
        {/* Visual Circuit (SVG) */}
        <div style={{ flex: 1.2, position: "relative", minHeight: "300px" }}>
          <svg viewBox="0 0 400 300" style={{ width: "100%", height: "100%" }}>
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="400" height="300" fill="url(#grid)" rx="15" />

            {/* Wire Paths (Main Circuit Loop) */}
            <rect
              x="50"
              y="50"
              width="300"
              height="200"
              fill="none"
              stroke="#334155"
              strokeWidth="6"
              rx="10"
            />

            {/* Flowing current dashes (animated along wire) */}
            <rect
              x="50"
              y="50"
              width="300"
              height="200"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="4"
              strokeDasharray="15, 10"
              strokeDashoffset={-flowOffset}
              rx="10"
              style={{ filter: "drop-shadow(0 0 4px #F59E0B)" }}
            />

            {/* Battery Symbol Left (50, 150) */}
            <g transform="translate(40, 120)">
              {/* Battery background card */}
              <rect x="0" y="0" width="20" height="60" rx="5" fill="#1E293B" stroke="#3B82F6" strokeWidth="2" />
              {/* Battery poles */}
              <line x1="5" y1="15" x2="15" y2="15" stroke="#F8FAFC" strokeWidth="3" />
              <line x1="10" y1="10" x2="10" y2="20" stroke="#F8FAFC" strokeWidth="3" />
              <line x1="5" y1="45" x2="15" y2="45" stroke="#F8FAFC" strokeWidth="3" />
              <text x="10" y="-8" textAnchor="middle" fill="#3B82F6" fontSize="14" fontWeight="bold">V</text>
            </g>

            {/* Resistor Symbol Top (200, 50) */}
            <g transform="translate(160, 35)">
              <rect x="0" y="0" width="80" height="30" rx="5" fill="#1E293B" stroke="#10B981" strokeWidth="2" />
              {/* Resistor zig-zag line inside */}
              <path d="M 10 15 L 20 5 L 30 25 L 40 5 L 50 25 L 60 5 L 70 15" fill="none" stroke="#10B981" strokeWidth="3" />
              <text x="40" y="-12" textAnchor="middle" fill="#10B981" fontSize="14" fontWeight="bold">R</text>
            </g>

            {/* Ammeter Symbol Right (350, 150) */}
            <g transform="translate(325, 120)">
              <circle cx="25" cy="25" r="22" fill="#1E293B" stroke="#EF4444" strokeWidth="2" />
              <text x="25" y="32" textAnchor="middle" fill="#EF4444" fontSize="20" fontWeight="bold" fontFamily="monospace">A</text>
              <text x="25" y="-8" textAnchor="middle" fill="#EF4444" fontSize="14" fontWeight="bold">I</text>
            </g>
          </svg>
        </div>

        {/* Info panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "15px" }}>
          {/* Voltage Display */}
          <div style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", padding: "12px 18px", borderRadius: "12px" }}>
            <span style={{ fontSize: "14px", color: "#93C5FD" }}>🔋 فرق الجهد (V):</span>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#3B82F6", fontFamily: "monospace" }}>
              {currentVoltage.toFixed(2)} V
            </div>
          </div>

          {/* Resistance Display */}
          <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", padding: "12px 18px", borderRadius: "12px" }}>
            <span style={{ fontSize: "14px", color: "#6EE7B7" }}>⚡ المقاومة (R):</span>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#10B981", fontFamily: "monospace" }}>
              {currentResistance.toFixed(1)} Ω
            </div>
          </div>

          {/* Current Display */}
          <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "16px 20px", borderRadius: "16px", boxShadow: "0 0 15px rgba(239, 68, 68, 0.1)" }}>
            <span style={{ fontSize: "14px", color: "#FCA5A5" }}>💡 شدة التيار الناتج (I):</span>
            <div style={{ fontSize: "36px", fontWeight: 800, color: "#EF4444", fontFamily: "monospace" }}>
              {currentI.toFixed(2)} A
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
