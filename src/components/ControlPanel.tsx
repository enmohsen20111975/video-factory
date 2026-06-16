import React, { useState, useRef } from "react";
import { AbsoluteFill, useVideoConfig, useCurrentFrame, interpolate } from "remotion";

interface ControlPanelProps {
  text: string;
  voice?: string;
  onTextChange?: (newText: string) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  text = "اكتب النص هنا...",
  voice = "ar-EG-SalmaNeural"
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [editableText, setEditableText] = useState(text);
  const [isEditing, setIsEditing] = useState(false);

  // Animation for panel appearance
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const translateY = interpolate(frame, [0, 20], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        right: 20,
        backgroundColor: "rgba(30, 41, 59, 0.9)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "16px",
        padding: "20px",
        width: "380px",
        opacity,
        transform: `translateY(${translateY}px)`,
        zIndex: 1000,
        fontFamily: "'Cairo', sans-serif"
      }}
    >
      <div style={{ color: "#F8FAFC", fontSize: "16px", fontWeight: 600, marginBottom: "15px" }}>
        🎛️ لوحة التحكم بالنص والصوت
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label style={{ color: "#94A3B8", fontSize: "13px", display: "block", marginBottom: "5px" }}>
          النص العربي:
        </label>
        <textarea
          value={editableText}
          onChange={(e) => setEditableText(e.target.value)}
          placeholder="اكتب نص الشرح هنا..."
          style={{
            width: "100%",
            minHeight: "80px",
            backgroundColor: "#1E293B",
            border: "1px solid #334155",
            borderRadius: "8px",
            color: "#F8FAFC",
            fontSize: "14px",
            padding: "10px",
            resize: "vertical",
            fontFamily: "'Cairo', sans-serif"
          }}
          rows={3}
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label style={{ color: "#94A3B8", fontSize: "13px", display: "block", marginBottom: "8px" }}>
          الصوت المستخدم:
        </label>
        <select
          defaultValue={voice}
          style={{
            width: "100%",
            backgroundColor: "#1E293B",
            border: "1px solid #334155",
            borderRadius: "8px",
            color: "#F8FAFC",
            fontSize: "14px",
            padding: "8px 10px",
            fontFamily: "'Cairo', sans-serif"
          }}
        >
          <option value="ar-EG-SalmaNeural">سلمى (مصر)</option>
          <option value="ar-EG-ShakirNeural">شاكر (مصر)</option>
          <option value="ar-SA-NorahNeural">نورة (سعودية)</option>
          <option value="ar-AE-FatimaNeural">فاطمة (إمارات)</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          style={{
            flex: 1,
            backgroundColor: "#3B82F6",
            color: "#F8FAFC",
            border: "none",
            borderRadius: "8px",
            padding: "10px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          🔄 توليد الصوت
        </button>
        <button
          style={{
            flex: 1,
            backgroundColor: "#10B981",
            color: "#F8FAFC",
            border: "none",
            borderRadius: "8px",
            padding: "10px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          💾 حفظ والمعاينة
        </button>
      </div>
    </div>
  );
};