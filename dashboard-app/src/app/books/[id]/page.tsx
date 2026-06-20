"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Play,
  Square,
  Film,
  Download,
  Loader2,
  BookOpen,
  FileText,
  Layers,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { LessonTree } from "@/components/LessonTree";
import { PageLoader, EmptyState } from "@/components/ui/spinner";
import {
  booksApi,
  videosApi,
} from "@/lib/api";
import { useFetch, usePolling } from "@/hooks/use-fetch";
import { useAsyncAction } from "@/hooks/use-async-action";
import {
  SUBJECT_LABELS,
  SUBJECT_ICONS,
  GRADE_LABELS,
  formatDate,
} from "@/lib/utils";
import type {
  MasterBook,
  ExtractionStatusResponse,
  QueueResponse,
} from "@/lib/types";

export default function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id: bookId } = React.use(params);
  const { run: actionRun } = useAsyncAction();

  const {
    data: master,
    loading,
    refetch,
  } = useFetch<MasterBook>(() => booksApi.get(bookId), [bookId]);

  const { data: extraction } = usePolling<ExtractionStatusResponse>(
    () => booksApi.getExtractionStatus(bookId),
    3000,
    {
      enabled:
        master?.book.extraction_status === "extracting" ||
        master?.book.extraction_status === "pending",
    },
  );

  const { data: queue, refetch: refetchQueue } = usePolling<QueueResponse>(
    () => videosApi.getQueue(),
    5000,
  );

  const isExtracting = master?.book.extraction_status === "extracting";
  const isPending = master?.book.extraction_status === "pending";

  const handleStartExtraction = () => {
    actionRun(() => booksApi.startExtraction(bookId), {
      successMessage: "تم بدء الاستخراج",
      onSuccess: refetch,
    });
  };

  const handleStopExtraction = () => {
    actionRun(() => booksApi.stopExtraction(bookId), {
      successMessage: "تم إيقاف الاستخراج",
      onSuccess: refetch,
    });
  };

  const handleGenerateAll = () => {
    if (!master) return;
    const items = master.units
      .flatMap((u) => u.lessons)
      .filter(
        (l) =>
          l.status === "extracted" ||
          l.status === "reviewed" ||
          l.status === "video_generated",
      )
      .map((l) => ({ book_id: bookId, lesson_id: l.id }));
    if (!items.length) {
      return;
    }
    actionRun(() => videosApi.generateBatch(items), {
      successMessage: `تمت إضافة ${items.length} درس إلى قائمة الانتظار`,
      onSuccess: refetchQueue,
    });
  };

  const handleExport = () => {
    actionRun(() => videosApi.exportEducation(bookId), {
      successMessage: "تم تصدير الدروس لمنصة education",
    });
  };

  if (loading) {
    return (
      <>
        <Header title="تفاصيل الكتاب" />
        <PageLoader />
      </>
    );
  }

  if (!master) {
    return (
      <>
        <Header title="الكتاب غير موجود" />
        <Card className="m-6 p-8">
          <EmptyState
            icon={<AlertCircle className="h-10 w-10" />}
            title="لم يتم العثور على الكتاب"
            description={`الكتاب بمعرّف ${bookId} غير موجود`}
            action={
              <Button asChild variant="outline">
                <Link href="/books">
                  <ArrowRight className="h-4 w-4" />
                  العودة للمكتبة
                </Link>
              </Button>
            }
          />
        </Card>
      </>
    );
  }

  const { book, stats } = master;

  return (
    <>
      <Header
        title={book.title}
        description={`${SUBJECT_LABELS[book.subject]} • ${GRADE_LABELS[book.grade]}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/books">
              <ArrowRight className="h-4 w-4" />
              رجوع
            </Link>
          </Button>
        }
      />

      <main className="flex-1 p-4 md:p-6 space-y-4">
        {/* Book header card */}
        <Card className="p-5">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-800/60 border border-slate-700 text-3xl">
              {SUBJECT_ICONS[book.subject]}
            </div>
            <div className="flex-1 min-w-[200px]">
              <h2 className="text-xl font-bold">{book.title}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Badge variant="secondary">{SUBJECT_LABELS[book.subject]}</Badge>
                <Badge variant="outline">{GRADE_LABELS[book.grade]}</Badge>
                {book.publisher && (
                  <Badge variant="outline">الناشر: {book.publisher}</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                المعرّف: <code className="text-foreground" dir="ltr">{book.id}</code>
                {" • "}
                {book.total_pages} صفحة
                {" • "}
                أُنشئ {formatDate(book.created_at)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="success"
                size="sm"
                onClick={handleGenerateAll}
                disabled={stats.extracted_lessons === 0}
              >
                <Film className="h-4 w-4" />
                توليد كل الفيديوهات
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4" />
                تصدير لـ education
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800">
            <StatBox
              icon={Layers}
              label="الوحدات"
              value={stats.total_units}
              color="text-amber-400"
            />
            <StatBox
              icon={BookOpen}
              label="الدروس"
              value={stats.total_lessons}
              color="text-sky-400"
            />
            <StatBox
              icon={FileText}
              label="مستخرَجة"
              value={stats.extracted_lessons}
              color="text-emerald-400"
            />
            <StatBox
              icon={Film}
              label="فيديو جاهز"
              value={stats.videos_generated}
              color="text-violet-400"
            />
          </div>
        </Card>

        {/* Extraction status banner */}
        {(isExtracting || isPending || extraction) && (
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {isExtracting && (
                  <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                )}
                {isPending && (
                  <Play className="h-5 w-5 text-emerald-400" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      حالة الاستخراج
                    </span>
                    <StatusBadge
                      status={
                        extraction?.status ?? book.extraction_status
                      }
                      pulse={isExtracting}
                    />
                  </div>
                  {extraction && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {extraction.pages_extracted ?? 0} / {extraction.total_pages ?? book.total_pages} صفحة
                      {extraction.pages_failed ? ` • فشل: ${extraction.pages_failed}` : ""}
                      {extraction.estimated_completion &&
                        ` • انتهاء متوقع: ${formatDate(extraction.estimated_completion)}`}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 min-w-[200px]">
                <ProgressBar
                  value={extraction?.progress ?? book.extraction_progress}
                  size="md"
                  showLabel
                  className="flex-1"
                />
                {isPending && (
                  <Button size="sm" variant="success" onClick={handleStartExtraction}>
                    <Play className="h-3.5 w-3.5" />
                    بدء
                  </Button>
                )}
                {isExtracting && (
                  <Button size="sm" variant="warning" onClick={handleStopExtraction}>
                    <Square className="h-3.5 w-3.5" />
                    إيقاف
                  </Button>
                )}
              </div>
            </div>

            {/* Errors */}
            {extraction?.errors && extraction.errors.length > 0 && (
              <div className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/5 p-2 text-xs">
                <p className="text-rose-400 font-medium mb-1">أخطاء الاستخراج:</p>
                <ul className="space-y-0.5 max-h-32 overflow-auto">
                  {extraction.errors.slice(0, 10).map((e, i) => (
                    <li key={i} className="text-rose-300/80">
                      صفحة {e.page}: {e.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}

        {/* Lesson tree */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              الوحدات والدروس
            </h3>
            <Button variant="ghost" size="sm" onClick={refetch}>
              <RefreshCw className="h-3.5 w-3.5" />
              تحديث
            </Button>
          </div>
          <LessonTree master={master} />
        </Card>

        {/* Queue quick view */}
        {queue && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Film className="h-4 w-4 text-primary" />
                طابور هذا الكتاب
              </h3>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/videos?book=${book.id}`}>
                  استوديو الفيديو
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
            <div className="space-y-1.5">
              {[...queue.active_jobs, ...queue.pending_queue]
                .filter((q) => q.book_id === bookId)
                .slice(0, 5)
                .map((job) => (
                  <div
                    key={`${job.book_id}-${job.lesson_id}`}
                    className="flex items-center gap-2 text-xs"
                  >
                    <StatusBadge
                      status={job.status}
                      className="text-[10px]"
                      pulse={job.status === "processing"}
                    />
                    <span className="truncate flex-1">{job.lesson_title}</span>
                  </div>
                ))}
              {![...queue.active_jobs, ...queue.pending_queue].some(
                (q) => q.book_id === bookId,
              ) && (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  لا توجد مهام في الطابور لهذا الكتاب
                </p>
              )}
            </div>
          </Card>
        )}
      </main>
    </>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
      <Icon className={`h-5 w-5 ${color}`} />
      <div>
        <p className="text-xl font-bold tabular-nums">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
