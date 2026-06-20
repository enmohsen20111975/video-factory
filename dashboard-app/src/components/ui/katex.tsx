"use client";

import * as React from "react";
import katex from "katex";

interface KatexRendererProps {
  latex: string;
  display?: boolean;
  className?: string;
}

export function KatexRenderer({
  latex,
  display = false,
  className,
}: KatexRendererProps) {
  const containerRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (!containerRef.current || !latex) return;
    try {
      katex.render(latex, containerRef.current, {
        throwOnError: false,
        displayMode: display,
        output: "html",
        trust: true,
      });
    } catch (err) {
      if (containerRef.current) {
        containerRef.current.textContent = `خطأ في الصيغة: ${latex}`;
      }
    }
  }, [latex, display]);

  if (!latex) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <span
      ref={containerRef}
      className={className}
      dir="ltr"
      lang="math"
    />
  );
}
