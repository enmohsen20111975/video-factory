"use client";

import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  className?: string;
  indicatorClassName?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function ProgressBar({
  value,
  className,
  indicatorClassName,
  showLabel,
  size = "md",
}: ProgressBarProps) {
  const v = Math.max(0, Math.min(100, value || 0));
  const heightClass =
    size === "sm" ? "h-1" : size === "lg" ? "h-3" : "h-2";

  // Choose color based on value
  const colorClass =
    v === 100
      ? "bg-emerald-500"
      : v > 50
        ? "bg-primary"
        : v > 0
          ? "bg-amber-500"
          : "bg-slate-600";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Progress
        value={v}
        className={cn(heightClass, "flex-1")}
        indicatorClassName={cn(colorClass, indicatorClassName)}
      />
      {showLabel && (
        <span className="text-xs tabular-nums text-muted-foreground w-10 text-left">
          {Math.round(v)}%
        </span>
      )}
    </div>
  );
}
