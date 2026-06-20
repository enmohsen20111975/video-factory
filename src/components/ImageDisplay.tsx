import React from "react";
import { Img, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

interface ImageDisplayProps {
  /**
   * Image path. The render orchestrator copies any image referenced by the
   * lesson into `public/active-images/<basename>` so Remotion's `staticFile`
   * can serve it. The component therefore only needs the final basename.
   */
  imagePath?: string;
  /** Caption shown under the image (lesson.images[i].description). */
  description?: string;
  /** Optional title shown above the image frame. */
  title?: string;
}

// Decide which URL to load. If the caller passes an absolute URL or a
// `staticFile`-compatible relative path, use it directly. Otherwise assume
// the render orchestrator has placed the image at
// `public/active-images/<basename>`.
function resolveImageSrc(imagePath?: string): string | null {
  if (!imagePath) return null;
  if (/^https?:\/\//i.test(imagePath) || imagePath.startsWith("data:")) {
    return imagePath;
  }
  // If it already looks like a public-relative path use it as is, otherwise
  // reduce it to its basename and resolve under /active-images/.
  if (imagePath.startsWith("active-images/") || imagePath.startsWith("/active-images/")) {
    return staticFile(imagePath.replace(/^\//, ""));
  }
  const basename = imagePath.split(/[\\/]/).pop() ?? imagePath;
  return staticFile(`active-images/${basename}`);
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({
  imagePath,
  description,
  title,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const src = resolveImageSrc(imagePath);

  const containerSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 110 },
  });

  const titleSpring = spring({
    frame: frame - 12,
    fps,
    config: { damping: 14, stiffness: 110 },
  });

  const captionSpring = spring({
    frame: frame - 24,
    fps,
    config: { damping: 14, stiffness: 110 },
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
      {title && (
        <div
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "#A855F7",
            opacity: titleSpring,
            transform: `translateY(${(1 - titleSpring) * 12}px)`,
          }}
        >
          {title}
        </div>
      )}

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "640px",
          borderRadius: "16px",
          overflow: "hidden",
          background: "#0B0F19",
          border: "2px solid rgba(99, 102, 241, 0.25)",
          boxShadow: "0 0 25px rgba(99, 102, 241, 0.15)",
        }}
      >
        {src ? (
          <Img
            src={src}
            alt={description || title || "lesson image"}
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              maxHeight: "480px",
              objectFit: "contain",
            }}
          />
        ) : (
          <div
            style={{
              height: "320px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#475569",
              fontSize: "20px",
            }}
          >
            لا توجد صورة
          </div>
        )}
      </div>

      {description && (
        <div
          style={{
            fontSize: "18px",
            color: "#CBD5E1",
            textAlign: "center",
            lineHeight: 1.6,
            maxWidth: "640px",
            opacity: captionSpring,
            transform: `translateY(${(1 - captionSpring) * 12}px)`,
          }}
        >
          {description}
        </div>
      )}
    </div>
  );
};
