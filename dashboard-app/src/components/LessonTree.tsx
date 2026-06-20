"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  FileText,
  Film,
  FolderOpen,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MasterBook, Unit, LessonSummary } from "@/lib/types";
import { truncate } from "@/lib/utils";

interface LessonTreeProps {
  master: MasterBook;
  activeLessonId?: string;
  loading?: boolean;
}

export function LessonTree({ master, activeLessonId, loading }: LessonTreeProps) {
  const router = useRouter();
  const [expanded, setExpanded] = React.useState<Set<string>>(
    () => new Set(master.units.map((u) => u.id)),
  );

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!master.units.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">لا توجد وحدات بعد. ابدأ الاستخراج لرؤية الدروس.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full max-h-[70vh]">
      <div className="space-y-1 pr-1">
        {master.units.map((unit) => (
          <UnitNode
            key={unit.id}
            unit={unit}
            expanded={expanded.has(unit.id)}
            onToggle={() => toggle(unit.id)}
            activeLessonId={activeLessonId}
            bookId={master.book.id}
            onLessonClick={(lessonId) =>
              router.push(`/lessons/${master.book.id}/${lessonId}`)
            }
          />
        ))}
      </div>
    </ScrollArea>
  );
}

interface UnitNodeProps {
  unit: Unit;
  expanded: boolean;
  onToggle: () => void;
  activeLessonId?: string;
  bookId: string;
  onLessonClick: (lessonId: string) => void;
}

function UnitNode({
  unit,
  expanded,
  onToggle,
  activeLessonId,
  onLessonClick,
}: UnitNodeProps) {
  const extractedCount = unit.lessons.filter(
    (l) => l.status !== "pending" && l.status !== "extracting",
  ).length;
  const videoCount = unit.lessons.filter(
    (l) => l.video_status === "generated",
  ).length;

  return (
    <div className="rounded-md">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-right transition-colors hover:bg-slate-800/60"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <FolderOpen className="h-4 w-4 text-amber-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-foreground truncate">
            {unit.title}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <FileText className="h-3 w-3" />
              {extractedCount}/{unit.lessons.length}
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-0.5">
              <Film className="h-3 w-3" />
              {videoCount}
            </span>
            <span className="text-slate-600">•</span>
            <span>
              ص {unit.page_start}-{unit.page_end}
            </span>
          </div>
        </div>
      </button>

      {expanded && unit.lessons.length > 0 && (
        <div className="mr-4 mt-0.5 space-y-0.5 border-r border-slate-800 pr-2">
          {unit.lessons.map((lesson) => (
            <LessonNode
              key={lesson.id}
              lesson={lesson}
              active={lesson.id === activeLessonId}
              onClick={() => onLessonClick(lesson.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LessonNode({
  lesson,
  active,
  onClick,
}: {
  lesson: LessonSummary;
  active: boolean;
  onClick: () => void;
}) {
  const isPending = lesson.status === "pending";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-right transition-colors",
        active
          ? "bg-primary/10 border border-primary/30"
          : "hover:bg-slate-800/40 border border-transparent",
        isPending && "opacity-50 cursor-not-allowed",
      )}
    >
      <FileText
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          active ? "text-primary" : "text-muted-foreground",
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm truncate" title={lesson.title}>
          {truncate(lesson.title, 50)}
        </div>
        <div className="text-[10px] text-muted-foreground">
          صفحة {lesson.page_start}-{lesson.page_end}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <StatusBadge
          status={lesson.status}
          className="text-[9px] px-1.5 py-0"
        />
        {lesson.video_status !== "not_generated" && (
          <StatusBadge
            status={lesson.video_status}
            className="text-[9px] px-1.5 py-0"
          />
        )}
      </div>
    </button>
  );
}
