import "./index.css";
import { Composition } from "remotion";
import { LessonVideo } from "./compositions/LessonVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LessonVideo"
        component={LessonVideo}
        durationInFrames={30 * 75} // 75 seconds * 30fps = 2250 frames
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "قانون أوم وتطبيقاته",
          topic: "الفيزياء الكهربية - تالتة ثانوي"
        }}
      />
    </>
  );
};
