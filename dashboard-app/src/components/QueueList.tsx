"use client";

import * as React from "react";
import { Clock, Film, Loader2, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/ui/spinner";
import { formatRelative } from "@/lib/utils";
import type { QueueResponse, QueueItem } from "@/lib/types";

interface QueueListProps {
  queue: QueueResponse | undefined;
  loading?: boolean;
  className?: string;
}

export function QueueList({ queue, loading, className }: QueueListProps) {
  const active = queue?.active_jobs ?? [];
  const pending = queue?.pending_queue ?? [];
  const completed = queue?.completed ?? [];
  const failed = queue?.failed ?? [];

  const total = active.length + pending.length;

  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          قائمة الانتظار
          {total > 0 && (
            <span className="rounded-full bg-primary/15 text-primary text-[10px] px-1.5 py-0.5">
              {total}
            </span>
          )}
        </h3>
        {queue?.last_updated && (
          <span className="text-[10px] text-muted-foreground">
            آخر تحديث: {formatRelative(queue.last_updated)}
          </span>
        )}
      </div>

      {loading && !queue ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : total === 0 && failed.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-8 w-8 text-emerald-400" />}
          title="لا توجد مهام نشطة"
          description="الطابور فارغ حالياً"
        />
      ) : (
        <ScrollArea className="max-h-96">
          <div className="space-y-2 pr-1">
            {active.map((item) => (
              <QueueRow key={`active-${item.lesson_id}`} item={item} variant="active" />
            ))}
            {pending.map((item) => (
              <QueueRow key={`pending-${item.lesson_id}`} item={item} variant="pending" />
            ))}
            {failed.slice(0, 5).map((item) => (
              <QueueRow key={`failed-${item.lesson_id}`} item={item} variant="failed" />
            ))}
            {completed.slice(0, 3).map((item) => (
              <QueueRow key={`completed-${item.lesson_id}`} item={item} variant="completed" />
            ))}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
}

function QueueRow({
  item,
  variant,
}: {
  item: QueueItem;
  variant: "active" | "pending" | "failed" | "completed";
}) {
  const Icon = {
    active: Loader2,
    pending: Clock,
    failed: AlertCircle,
    completed: CheckCircle2,
  }[variant];

  const iconClass = {
    active: "text-amber-400 animate-spin",
    pending: "text-slate-400",
    failed: "text-rose-400",
    completed: "text-emerald-400",
  }[variant];

  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/40 p-2">
      <Icon className={cn("h-4 w-4 shrink-0", iconClass)} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate" title={item.lesson_title}>
          {item.lesson_title}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {item.book_id} • {formatRelative(item.added_at)}
        </p>
      </div>
      <StatusBadge
        status={item.status}
        className="text-[10px] px-1.5 py-0"
        pulse={item.status === "processing"}
      />
    </div>
  );
}
