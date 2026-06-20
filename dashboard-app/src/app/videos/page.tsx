"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Film,
  Play,
  Download,
  Loader2,
  Pause,
  RefreshCw,
  CheckSquare,
  Square,
  Eye,
  Edit3,
  AlertCircle,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { ProgressBar } from "@/components/ProgressBar";
import { QueueList } from "@/components/QueueList";
import { LogPanel, type LogEntry } from "@/components/LogPanel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PageLoader, EmptyState } from "@/components/ui/spinner";
import {
  booksApi,
  videosApi,
  videoFileUrl,
} from "@/lib/api";
import { useFetch, usePolling } from "@/hooks/use-fetch";
import { useAsyncAction } from "@/hooks/use-async-action";
import { cn } from "@/lib/utils";
import type {
  BookListItem,
  MasterBook,
  QueueResponse,
  QueueItem,
} from "@/lib/types";

interface LessonRow {
  bookId: string;
  lessonId: string;
  title: string;
  unit: string;
  status: string;
  videoStatus: string;
}

export default function VideosPageWrapper() {
  return (
    <React.Suspense fallback={<PageLoader />}>
      <VideosPage />
    </React.Suspense>
  );
}

function VideosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialBook = searchParams.get("book") || "all";
  const [selectedBook, setSelectedBook] = React.useState<string>(initialBook);
  const [selectedLessons, setSelectedLessons] = React.useState<Set<string>>(new Set());
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const { run: actionRun } = useAsyncAction();

  const { data: books, loading: booksLoading } = useFetch<BookListItem[]>(
    () => booksApi.list(),
    [],
  );

  const { data: master } = useFetch<MasterBook | null>(
    () =>
      selectedBook !== "all"
        ? booksApi.get(selectedBook)
        : Promise.resolve(null),
    [selectedBook],
  );

  const { data: queue, refetch: refetchQueue } = usePolling<QueueResponse>(
    () => videosApi.getQueue(),
    3000,
  );

  // Build lesson rows
  const lessons = React.useMemo<LessonRow[]>(() => {
    if (selectedBook === "all") {
      // Combine from queue
      const rows: LessonRow[] = [];
      const all = [
        ...(queue?.active_jobs ?? []),
        ...(queue?.pending_queue ?? []),
        ...(queue?.completed ?? []),
        ...(queue?.failed ?? []),
      ];
      const seen = new Set<string>();
      for (const item of all) {
        const key = `${item.book_id}:${item.lesson_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({
          bookId: item.book_id,
          lessonId: item.lesson_id,
          title: item.lesson_title,
          unit: "—",
          status: item.status,
          videoStatus: item.status === "completed" ? "generated" : item.status,
        });
      }
      return rows;
    }
    if (!master) return [];
    return master.units.flatMap((u) =>
      u.lessons.map((l) => ({
        bookId: master.book.id,
        lessonId: l.id,
        title: l.title,
        unit: u.title,
        status: l.status,
        videoStatus: l.video_status,
      })),
    );
  }, [master, queue, selectedBook]);

  const pushLog = (level: LogEntry["level"], message: string) => {
    setLogs((prev) =>
      [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          level,
          message,
        },
      ].slice(-300),
    );
  };

  const toggleLesson = (key: string) => {
    setSelectedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedLessons.size === lessons.length) {
      setSelectedLessons(new Set());
    } else {
      setSelectedLessons(new Set(lessons.map((l) => `${l.bookId}:${l.lessonId}`)));
    }
  };

  const handleGenerateSelected = () => {
    const items = Array.from(selectedLessons).map((k) => {
      const [book_id, lesson_id] = k.split(":");
      return { book_id, lesson_id };
    });
    if (!items.length) return;
    pushLog("info", `توليد ${items.length} فيديو...`);
    actionRun(() => videosApi.generateBatch(items), {
      successMessage: `تمت إضافة ${items.length} فيديو إلى الطابور`,
      onSuccess: () => {
        pushLog("success", `تمت إضافة ${items.length} مهمة بنجاح`);
        refetchQueue();
      },
      onError: (e) => pushLog("error", e.message),
    });
  };

  const handleGenerateAll = () => {
    if (!master) return;
    const items = master.units
      .flatMap((u) => u.lessons)
      .filter((l) => l.status !== "pending" && l.video_status !== "generated")
      .map((l) => ({ book_id: master.book.id, lesson_id: l.id }));
    if (!items.length) {
      pushLog("warn", "لا توجد دروس صالحة للتوليد");
      return;
    }
    pushLog("info", `توليد كل الفيديوهات (${items.length})...`);
    actionRun(() => videosApi.generateBatch(items), {
      successMessage: `تمت إضافة ${items.length} فيديو إلى الطابور`,
      onSuccess: () => {
        pushLog("success", `تمت إضافة ${items.length} مهمة`);
        refetchQueue();
      },
    });
  };

  const handleCancel = (bookId: string, lessonId: string, title: string) => {
    actionRun(() => videosApi.cancel(bookId, lessonId), {
      successMessage: `تم إلغاء توليد: ${title}`,
      onSuccess: () => {
        pushLog("warn", `إلغاء: ${title}`);
        refetchQueue();
      },
    });
  };

  // Sync logs from queue changes
  const prevQueueRef = React.useRef<QueueResponse | null>(null);
  React.useEffect(() => {
    if (!queue) return;
    const prev = prevQueueRef.current;
    if (prev) {
      // detect new completed
      const prevCompleted = new Set(
        prev.completed.map((c) => `${c.book_id}:${c.lesson_id}`),
      );
      queue.completed.forEach((c) => {
        if (!prevCompleted.has(`${c.book_id}:${c.lesson_id}`)) {
          pushLog("success", `اكتمل: ${c.lesson_title}`);
        }
      });
      const prevFailed = new Set(
        prev.failed.map((c) => `${c.book_id}:${c.lesson_id}`),
      );
      queue.failed.forEach((c) => {
        if (!prevFailed.has(`${c.book_id}:${c.lesson_id}`)) {
          pushLog("error", `فشل: ${c.lesson_title}${c.error ? ` - ${c.error}` : ""}`);
        }
      });
      const prevActive = new Set(
        prev.active_jobs.map((c) => `${c.book_id}:${c.lesson_id}`),
      );
      queue.active_jobs.forEach((c) => {
        if (!prevActive.has(`${c.book_id}:${c.lesson_id}`)) {
          pushLog("info", `بدء المعالجة: ${c.lesson_title}`);
        }
      });
    } else {
      // first load
      queue.active_jobs.forEach((c) =>
        pushLog("info", `قيد المعالجة: ${c.lesson_title}`),
      );
    }
    prevQueueRef.current = queue;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue]);

  if (booksLoading) {
    return (
      <>
        <Header title="استوديو الفيديو" />
        <PageLoader />
      </>
    );
  }

  return (
    <>
      <Header
        title="استوديو الفيديو"
        description="إدارة توليد الفيديو والدروس"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchQueue()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            تحديث
          </Button>
        }
      />
      <main className="flex-1 p-4 md:p-6 space-y-4">
        {/* Book selector + bulk actions */}
        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5 flex-1 min-w-[200px]">
              <Label>الكتاب</Label>
              <Select value={selectedBook} onValueChange={setSelectedBook}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الكتب (طابور النظام)</SelectItem>
                  {(books ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="success"
              onClick={handleGenerateSelected}
              disabled={selectedLessons.size === 0}
            >
              <Film className="h-4 w-4" />
              توليد المحدد ({selectedLessons.size})
            </Button>
            {selectedBook !== "all" && (
              <Button onClick={handleGenerateAll}>
                <Film className="h-4 w-4" />
                توليد الكل
              </Button>
            )}
            {selectedLessons.size > 0 && (
              <Button
                variant="ghost"
                onClick={() => setSelectedLessons(new Set())}
              >
                إلغاء التحديد
              </Button>
            )}
          </div>
        </Card>

        {/* Lessons table */}
        <Card className="p-0 overflow-hidden">
          <div className="border-b border-slate-800 bg-slate-900/40 px-4 py-2.5 flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              الدروس {selectedBook !== "all" && master ? `(${lessons.length})` : ""}
            </h3>
            {lessons.length > 0 && (
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {selectedLessons.size === lessons.length ? (
                  <>
                    <Square className="h-3.5 w-3.5" />
                    إلغاء الكل
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-3.5 w-3.5" />
                    تحديد الكل
                  </>
                )}
              </Button>
            )}
          </div>
          {lessons.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Film className="h-10 w-10" />}
                title="لا توجد دروس"
                description={
                  selectedBook === "all"
                    ? "لا توجد مهام في طابور النظام"
                    : "هذا الكتاب لا يحتوي على دروس بعد"
                }
              />
            </div>
          ) : (
            <div className="max-h-[500px] overflow-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-900/95 backdrop-blur">
                  <tr className="border-b border-slate-800 text-xs text-muted-foreground">
                    <th className="w-10 p-2 text-right">
                      <Checkbox
                        checked={
                          selectedLessons.size === lessons.length &&
                          lessons.length > 0
                        }
                        onCheckedChange={toggleAll}
                      />
                    </th>
                    <th className="p-2 text-right font-medium">الدرس</th>
                    <th className="p-2 text-right font-medium hidden md:table-cell">
                      الوحدة
                    </th>
                    <th className="p-2 text-right font-medium">
                      حالة الفيديو
                    </th>
                    <th className="p-2 text-right font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((lesson) => {
                    const key = `${lesson.bookId}:${lesson.lessonId}`;
                    const checked = selectedLessons.has(key);
                    const isGenerated = lesson.videoStatus === "generated";
                    const isGenerating = lesson.videoStatus === "generating";
                    return (
                      <tr
                        key={key}
                        className={cn(
                          "border-b border-slate-800 transition-colors",
                          checked ? "bg-primary/5" : "hover:bg-slate-900/40",
                        )}
                      >
                        <td className="p-2">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleLesson(key)}
                          />
                        </td>
                        <td className="p-2">
                          <div className="font-medium truncate max-w-[200px]">
                            {lesson.title}
                          </div>
                          <div className="text-[10px] text-muted-foreground" dir="ltr">
                            {lesson.bookId}/{lesson.lessonId}
                          </div>
                        </td>
                        <td className="p-2 text-xs text-muted-foreground hidden md:table-cell">
                          {lesson.unit}
                        </td>
                        <td className="p-2">
                          <StatusBadge
                            status={lesson.videoStatus}
                            className="text-[10px]"
                            pulse={isGenerating}
                          />
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() =>
                                router.push(
                                  `/lessons/${lesson.bookId}/${lesson.lessonId}`,
                                )
                              }
                              title="تحرير"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                            {isGenerated && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() =>
                                  router.push(
                                    `/lessons/${lesson.bookId}/${lesson.lessonId}`,
                                  )
                                }
                                title="عرض"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {isGenerated && (
                              <a
                                href={videoFileUrl(lesson.bookId, lesson.lessonId)}
                                download
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
                                title="تحميل"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            )}
                            {isGenerating && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-rose-400"
                                onClick={() =>
                                  handleCancel(
                                    lesson.bookId,
                                    lesson.lessonId,
                                    lesson.title,
                                  )
                                }
                                title="إلغاء"
                              >
                                <Pause className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {!isGenerated && !isGenerating && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-emerald-400 hover:text-emerald-300"
                                onClick={() => {
                                  pushLog("info", `إضافة: ${lesson.title}`);
                                  actionRun(
                                    () =>
                                      videosApi.generate(
                                        lesson.bookId,
                                        lesson.lessonId,
                                      ),
                                    {
                                      successMessage: `أُضيف: ${lesson.title}`,
                                      onSuccess: refetchQueue,
                                    },
                                  );
                                }}
                                title="توليد"
                              >
                                <Play className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Active jobs + Completed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <QueueList queue={queue} />

          {/* Completed videos */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Download className="h-4 w-4 text-emerald-400" />
              فيديوهات مكتملة
              <Badge variant="success" className="text-[10px]">
                {queue?.completed.length ?? 0}
              </Badge>
            </h3>
            <div className="space-y-2 max-h-64 overflow-auto scrollbar-thin">
              {(queue?.completed ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  لا توجد فيديوهات مكتملة بعد
                </p>
              ) : (
                (queue?.completed ?? []).slice(-20).reverse().map((c) => (
                  <div
                    key={`${c.book_id}-${c.lesson_id}`}
                    className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/40 p-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">
                        {c.lesson_title}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {c.completed_at ? new Date(c.completed_at).toLocaleString("ar-EG") : ""}
                      </p>
                    </div>
                    <a
                      href={videoFileUrl(c.book_id, c.lesson_id)}
                      download
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent text-emerald-400"
                      title="تحميل"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Log panel */}
        <LogPanel
          logs={logs}
          onClear={() => setLogs([])}
          title="سجل النشاط"
        />
      </main>
    </>
  );
}
