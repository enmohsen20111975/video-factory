import React from "react";
import { Player } from "@remotion/player";
import { LessonVideo } from "../../compositions/LessonVideo";

export default function RemotionPlayer() {
  return (
    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
      <Player
        component={LessonVideo}
        durationInFrames={2250}
        fps={30}
        compositionWidth={1920}
        compositionHeight={1080}
        loop
        style={{ width: "100%" }}
        controls
        autoPlay
        initiallyShowControls
        allowFullscreen
        clickToPlayback
      />
    </div>
  );
}