"use client";

import * as React from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  downloadUrl?: string;
}

export function VideoPlayer({
  src,
  poster,
  className,
  downloadUrl,
}: VideoPlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [muted, setMuted] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [current, setCurrent] = React.useState(0);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) videoRef.current.pause();
    else videoRef.current.play();
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setMuted(videoRef.current.muted);
  };

  const onTimeUpdate = () => {
    if (!videoRef.current) return;
    const c = videoRef.current.currentTime;
    const d = videoRef.current.duration || 0;
    setCurrent(c);
    setDuration(d);
    setProgress(d ? (c / d) * 100 : 0);
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const v = parseFloat(e.target.value);
    videoRef.current.currentTime = (v / 100) * duration;
  };

  const fullscreen = () => {
    if (videoRef.current?.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={cn(
        "relative group overflow-hidden rounded-lg border border-slate-800 bg-black",
        className,
      )}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onTimeUpdate}
        className="w-full aspect-video object-contain bg-black"
        onClick={togglePlay}
      />

      {/* Controls overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={progress}
          onChange={onSeek}
          className="w-full h-1 cursor-pointer accent-primary"
          dir="ltr"
        />
        <div className="flex items-center justify-between mt-2 text-white">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/10"
              onClick={togglePlay}
            >
              {playing ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/10"
              onClick={toggleMute}
            >
              {muted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <span className="text-xs tabular-nums" dir="ltr">
              {fmt(current)} / {fmt(duration)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {downloadUrl && (
              <a
                href={downloadUrl}
                download
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white hover:bg-white/10"
                title="تحميل"
              >
                <Download className="h-4 w-4" />
              </a>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/10"
              onClick={fullscreen}
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Big play button */}
      {!playing && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center"
          aria-label="تشغيل"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 backdrop-blur border-2 border-white/30 group-hover:bg-primary group-hover:border-primary transition-colors">
            <Play className="h-7 w-7 text-white ml-1" fill="currentColor" />
          </div>
        </button>
      )}
    </div>
  );
}
