import "./index.css";
import { Composition } from "remotion";
import { LessonVideo, LessonVideoProps } from "./compositions/LessonVideo";

const DEFAULT_DURATION_FRAMES = 30 * 75; // 75 seconds at 30fps

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LessonVideo"
        component={LessonVideo}
        // Default duration: 75 seconds at 30fps (2250 frames). The render
        // orchestrator passes `durationInFramesOverride` via `--props` to
        // size the composition to match the lesson's scenes array.
        durationInFrames={DEFAULT_DURATION_FRAMES}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          bookId: "ohm-law",
          lessonId: "ohm-law",
          durationInFramesOverride: DEFAULT_DURATION_FRAMES,
        }}
        // Allow the composition duration to be controlled by props at render
        // time (used by `npx remotion render ... --props=...`).
        calculateMetadata={({ props }: { props: Partial<LessonVideoProps> }) => {
          const override = Number(props.durationInFramesOverride ?? 0);
          const frames =
            Number.isFinite(override) && override > 0
              ? Math.floor(override)
              : DEFAULT_DURATION_FRAMES;
          return {
            durationInFrames: frames,
            fps: 30,
            width: 1920,
            height: 1080,
          };
        }}
      />
    </>
  );
};
