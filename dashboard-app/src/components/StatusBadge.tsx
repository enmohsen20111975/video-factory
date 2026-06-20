"use client";

import * as React from "react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { STATUS_LABELS, cn } from "@/lib/utils";

type StatusVariant = BadgeProps["variant"];

interface StatusConfig {
  variant: StatusVariant;
  dot?: string;
}

const STATUS_VARIANTS: Record<string, StatusConfig> = {
  // Extraction / general status
  pending: { variant: "secondary", dot: "bg-slate-400" },
  extracting: { variant: "warning", dot: "bg-amber-400" },
  extracting_lesson: { variant: "warning", dot: "bg-amber-400" },
  completed: { variant: "success", dot: "bg-emerald-400" },
  extracted: { variant: "info", dot: "bg-sky-400" },
  reviewed: { variant: "success", dot: "bg-emerald-400" },
  failed: { variant: "destructive", dot: "bg-rose-400" },
  partial: { variant: "warning", dot: "bg-amber-400" },

  // Video status
  not_generated: { variant: "secondary", dot: "bg-slate-400" },
  generating: { variant: "warning", dot: "bg-amber-400" },
  video_generating: { variant: "warning", dot: "bg-amber-400" },
  video_generated: { variant: "success", dot: "bg-emerald-400" },
  generated: { variant: "success", dot: "bg-emerald-400" },
  cancelled: { variant: "secondary", dot: "bg-slate-400" },
  processing: { variant: "warning", dot: "bg-amber-400" },
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  pulse?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  label,
  pulse,
  className,
}: StatusBadgeProps) {
  const v: StatusConfig = STATUS_VARIANTS[status] ?? { variant: "outline" };
  const display = label ?? STATUS_LABELS[status] ?? status;

  return (
    <Badge
      variant={v.variant}
      className={cn("gap-1.5 font-medium", className)}
    >
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 rounded-full",
          v.dot,
          pulse && "animate-pulse",
        )}
      />
      {display}
    </Badge>
  );
}
