"use client";

import * as React from "react";
import { Terminal, Trash2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "success" | "debug";
  message: string;
}

interface LogPanelProps {
  logs: LogEntry[];
  className?: string;
  onClear?: () => void;
  title?: string;
  maxRows?: number;
}

const LEVEL_COLORS: Record<LogEntry["level"], string> = {
  info: "text-sky-400",
  warn: "text-amber-400",
  error: "text-rose-400",
  success: "text-emerald-400",
  debug: "text-slate-500",
};

const LEVEL_BG: Record<LogEntry["level"], string> = {
  info: "bg-sky-500/10",
  warn: "bg-amber-500/10",
  error: "bg-rose-500/10",
  success: "bg-emerald-500/10",
  debug: "bg-slate-500/10",
};

const LEVEL_LABELS: Record<LogEntry["level"], string> = {
  info: "INFO",
  warn: "WARN",
  error: "ERR ",
  success: "OK  ",
  debug: "DBG ",
};

export function LogPanel({
  logs,
  className,
  onClear,
  title = "سجل العمليات",
  maxRows = 200,
}: LogPanelProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = React.useState(true);

  React.useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const visibleLogs = logs.slice(-maxRows);

  const handleDownload = () => {
    const text = logs
      .map(
        (l) =>
          `[${l.timestamp}] ${LEVEL_LABELS[l.level]} ${l.message}`,
      )
      .join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `factory-logs-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-slate-800 bg-slate-950 overflow-hidden flex flex-col",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/50 px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <Terminal className="h-3.5 w-3.5 text-primary" />
          {title}
          <span className="text-muted-foreground">({logs.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="h-3 w-3 accent-primary"
            />
            تمرير تلقائي
          </label>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleDownload}
            title="تحميل السجل"
          >
            <Download className="h-3 w-3" />
          </Button>
          {onClear && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-rose-400"
              onClick={onClear}
              title="مسح"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div
          ref={scrollRef}
          className="p-2 font-mono text-[11px] leading-relaxed ltr-text"
          dir="ltr"
          style={{ maxHeight: 280 }}
        >
          {visibleLogs.length === 0 ? (
            <p className="text-muted-foreground/60 text-center py-8">
              لا توجد سجلات بعد
            </p>
          ) : (
            visibleLogs.map((log, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-2 px-2 py-0.5 rounded hover:bg-slate-900/40",
                )}
              >
                <span className="text-muted-foreground/70 shrink-0">
                  {log.timestamp.slice(11, 19)}
                </span>
                <span
                  className={cn(
                    "shrink-0 font-bold px-1 rounded",
                    LEVEL_COLORS[log.level],
                    LEVEL_BG[log.level],
                  )}
                >
                  {LEVEL_LABELS[log.level]}
                </span>
                <span className={cn("break-all", LEVEL_COLORS[log.level])}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
