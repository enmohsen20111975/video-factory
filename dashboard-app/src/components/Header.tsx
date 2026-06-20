"use client";

import * as React from "react";
import {
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { pipelineApi } from "@/lib/api";
import { usePolling } from "@/hooks/use-fetch";
import type { SystemStatus } from "@/lib/types";
import { Spinner } from "@/components/ui/spinner";

interface HeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

function MetricBar({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  const color =
    value > 85 ? "text-rose-400" : value > 60 ? "text-amber-400" : "text-emerald-400";
  const bar =
    value > 85 ? "bg-rose-500" : value > 60 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn("h-3.5 w-3.5", color)} />
      <span className="text-[10px] text-muted-foreground w-8">{label}</span>
      <div className="h-1 w-12 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={cn("h-full transition-all", bar)}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span className={cn("text-[10px] tabular-nums w-8", color)}>
        {Math.round(value)}%
      </span>
    </div>
  );
}

export function Header({ title, description, actions }: HeaderProps) {
  const { data, error } = usePolling<SystemStatus>(
    () => pipelineApi.getSystemStatus(),
    10000,
    { enabled: true },
  );

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex items-center justify-between gap-4 px-4 md:px-6 py-3 pr-14 md:pr-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg md:text-xl font-bold text-foreground truncate">
            {title}
          </h1>
          {description && (
            <p className="text-xs text-muted-foreground truncate">
              {description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* System metrics */}
          <div className="hidden lg:flex items-center gap-4 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-1.5">
            {!data ? (
              error ? (
                <div className="flex items-center gap-1.5 text-rose-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span className="text-[10px]">لا يوجد اتصال</span>
                </div>
              ) : (
                <Spinner size={12} />
              )
            ) : (
              <>
                <MetricBar label="CPU" value={data.cpu_percent} icon={Cpu} />
                <MetricBar
                  label="RAM"
                  value={data.memory.percent}
                  icon={MemoryStick}
                />
                <MetricBar
                  label="Disk"
                  value={data.disk.percent}
                  icon={HardDrive}
                />
                {data.gpu && (
                  <MetricBar
                    label="GPU"
                    value={data.gpu.utilization}
                    icon={Activity}
                  />
                )}
              </>
            )}
          </div>
          {actions}
        </div>
      </div>
    </header>
  );
}
