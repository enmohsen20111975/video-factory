"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  FileText,
  Film,
  Clock,
  Cpu,
  HardDrive,
  MemoryStick,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: string;
  accent?: "emerald" | "amber" | "rose" | "blue" | "violet";
  loading?: boolean;
  onClick?: () => void;
  href?: string;
}

const ACCENT_CLASSES: Record<string, string> = {
  emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-400 border-emerald-500/20",
  amber: "from-amber-500/10 to-amber-500/5 text-amber-400 border-amber-500/20",
  rose: "from-rose-500/10 to-rose-500/5 text-rose-400 border-rose-500/20",
  blue: "from-sky-500/10 to-sky-500/5 text-sky-400 border-sky-500/20",
  violet: "from-violet-500/10 to-violet-500/5 text-violet-400 border-violet-500/20",
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  hint,
  accent = "emerald",
  loading,
  onClick,
  href,
}: StatsCardProps) {
  const inner = (
    <Card
      className={cn(
        "relative overflow-hidden p-5 transition-all hover:shadow-lg hover:border-slate-700 group",
        (onClick || href) && "cursor-pointer",
        "border-slate-800",
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none",
          ACCENT_CLASSES[accent],
        )}
      />
      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <div className="h-8 w-16 bg-slate-800 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
              {value}
            </p>
          )}
          {hint && (
            <p className="text-[11px] text-muted-foreground/80">{hint}</p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900/60 border",
              ACCENT_CLASSES[accent],
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

export {
  BookOpen,
  FileText,
  Film,
  Clock,
  Cpu,
  HardDrive,
  MemoryStick,
};
