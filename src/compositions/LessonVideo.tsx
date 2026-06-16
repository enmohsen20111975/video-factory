import React, { useEffect, useState } from "react";
import { AbsoluteFill, Sequence, Audio, useVideoConfig, useCurrentFrame, delayRender, continueRender, staticFile } from "remotion";
import { FormulaWrite } from "../components/FormulaWrite";
import { SimulatorCinematic } from "../components/SimulatorCinematic";
import { MindMapCinematic } from "../components/MindMapCinematic";
import { QuizCinematic } from "../components/QuizCinematic";
import { ControlPanel } from "../components/ControlPanel";

export interface LessonVideoProps {
  lessonName?: string;
  title?: string;
  topic?: string;
}

interface TimestampWord {
  word: string;
  start: number;
  end: number;
  duration: number;
}

export const LessonVideo: React.FC<LessonVideoProps> = ({
  lessonName = "ohm-law",
  title = "قانون أوم وتطبيقاته",
  topic = "الفيزياء الكهربية - تالتة ثانوي"
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const [timestamps, setTimestamps] = useState<TimestampWord[]>([]);
  const [handle] = useState(() => delayRender("Loading timestamps data"));

  useEffect(() => {
    fetch(staticFile(`timestamps/${lessonName}.json`))
      .then((res) => res.json())
      .then((data) => {
        setTimestamps(data);
        continueRender(handle);
      })
      .catch((err) => {
        console.warn("Could not load timestamps JSON, using empty fallback:", err);
        continueRender(handle);
      });
  }, [lessonName, handle]);

  // Frame timings
  const introDuration = 4 * fps;      // 0 - 4s (120 frames)
  const titleDuration = 8 * fps;      // 4 - 12s (240 frames)
  const formulaDuration = 12 * fps;   // 12 - 24s (360 frames)
  const simulatorDuration = 16 * fps; // 24 - 40s (480 frames)
  const mindMapDuration = 15 * fps;   // 40 - 55s (450 frames)
  const quizDuration = 15 * fps;      // 55 - 70s (450 frames)
  const outroDuration = 5 * fps;      // 70 - 75s (150 frames)

  // Subtitle synchronization logic
  const renderSubtitles = (currentFrame: number) => {
    const currentTime = currentFrame / fps;
    
    // Find the word that matches the current timestamp
    // We can also show a window of a few words around it
    const activeWordIndex = timestamps.findIndex(
      (t) => currentTime >= t.start && currentTime <= t.end
    );

    if (activeWordIndex === -1) return null;

    // Show 3 words before and 3 words after for context
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
          border: "1px solid rgba(255, 255, 255, 0.05)"
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
                textShadow: isActive ? "0 0 10px rgba(245, 158, 11, 0.4)" : "none",
                transition: "all 0.15s ease-out"
              }}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    );
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
        overflow: "hidden"
      }}
    >
      {/* Animated subtle grid background */}
      <div
        style={{
          position: "absolute",
          width: "200%",
          height: "200%",
          backgroundImage: "radial-gradient(circle, rgba(99, 102, 241, 0.08) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
          top: "-50%",
          left: "-50%",
          transform: "rotate(5deg)",
          zIndex: 0
        }}
      />

      {/* Dynamic Voiceover Audio Playback */}
      <Audio src={staticFile(`voiceovers/${lessonName}.mp3`)} volume={1.0} />

      {/* Scene 1: Intro / Portal Splash (0 to 4 seconds) */}
      <Sequence from={0} durationInFrames={introDuration}>
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: "28px", color: "#6366F1", fontWeight: 600, letterSpacing: "1px", marginBottom: "10px" }}>
              💡 SMART EDUCATION
            </h2>
            <div style={{ width: "60px", height: "3px", background: "linear-gradient(to right, #6366F1, #A855F7)", margin: "0 auto" }} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 2: Lesson Title and Topic (4 to 12 seconds) */}
      <Sequence from={introDuration} durationInFrames={titleDuration}>
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "20px", color: "#A855F7", fontWeight: 600, marginBottom: "10px" }}>
              {topic}
            </p>
            <h1 style={{ fontSize: "56px", fontWeight: 800, background: "linear-gradient(to right, #F8FAFC, #94A3B8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: "10px 0" }}>
              {title}
            </h1>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 3: Formula Write Component (12 to 24 seconds) */}
      <Sequence from={introDuration + titleDuration} durationInFrames={formulaDuration}>
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
          <FormulaWrite />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 4: Simulator Cinematic (24 to 40 seconds) */}
      <Sequence from={introDuration + titleDuration + formulaDuration} durationInFrames={simulatorDuration}>
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
          <SimulatorCinematic
            voltage={9}
            voltageEnd={15}
            resistance={3}
            resistanceEnd={3}
            animationStartFrame={30}
            animationEndFrame={150}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 5: Mind Map Cinematic (40 to 55 seconds) */}
      <Sequence from={introDuration + titleDuration + formulaDuration + simulatorDuration} durationInFrames={mindMapDuration}>
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
          <MindMapCinematic />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 6: Quiz Cinematic (55 to 70 seconds) */}
      <Sequence from={introDuration + titleDuration + formulaDuration + simulatorDuration + mindMapDuration} durationInFrames={quizDuration}>
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
          <QuizCinematic
            question="مقاومة 5 أوم موصلة ببطارية 10 فولت. احسب التيار الناتج."
            options={["0.5 أمبير", "1 أمبير", "2 أمبير", "5 أمبير"]}
            correctIndex={2}
            explanation="الحل: I = V ÷ R => I = 10 ÷ 5 = 2 أمبير"
            timerStartFrame={20}
            timerDuration={90}
          />
        </AbsoluteFill>
      </Sequence>

{/* Scene 7: Outro (70 to 75 seconds) */}
      <Sequence from={introDuration + titleDuration + formulaDuration + simulatorDuration + mindMapDuration + quizDuration} durationInFrames={outroDuration}>
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: "36px", fontWeight: 800, background: "linear-gradient(to right, #6366F1, #A855F7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              شكراً لكم على المتابعة
            </h2>
            <p style={{ fontSize: "18px", color: "#94A3B8", marginTop: "15px" }}>
              اشترك في المنصة لمشاهدة المزيد من الدروس التفاعلية
            </p>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Synchronized subtitles rendered overlay */}
      {renderSubtitles(frame)}
    </AbsoluteFill>
  );
};
