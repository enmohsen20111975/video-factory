"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  Film,
  Settings,
  Clapperboard,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "لوحة التحكم", icon: LayoutDashboard, emoji: "📊" },
  { href: "/books", label: "الكتب", icon: BookOpen, emoji: "📚" },
  { href: "/videos", label: "استوديو الفيديو", icon: Film, emoji: "🎬" },
  { href: "/settings", label: "الإعدادات", icon: Settings, emoji: "⚙️" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Close mobile sidebar on route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile trigger */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-3 right-3 z-50 md:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 right-0 z-40 w-64 shrink-0 border-l border-slate-800 bg-sidebar text-sidebar-foreground transition-transform duration-300",
          "md:translate-x-0 md:static md:z-0",
          mobileOpen ? "translate-x-0" : "translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Brand */}
          <div className="flex items-center justify-between gap-2 p-5 border-b border-slate-800">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 border border-primary/30 text-primary group-hover:bg-primary/25 transition-colors">
                <Clapperboard className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold leading-tight text-foreground">
                  مصنع الفيديو
                </div>
                <div className="text-[10px] text-muted-foreground leading-tight">
                  Unified Video Factory
                </div>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all",
                    active
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-foreground border border-transparent",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active
                        ? "text-primary"
                        : "text-slate-400 group-hover:text-foreground",
                    )}
                  />
                  <span className="font-medium">{item.label}</span>
                  {active && (
                    <span className="mr-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-slate-800 p-4 space-y-2">
            <div className="rounded-md bg-slate-900/60 border border-slate-800 p-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-muted-foreground">النظام يعمل</span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground/70">
                Backend: localhost:3001
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
