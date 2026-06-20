"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  FileText,
  Film,
  Clock,
  Plus,
  ArrowLeft,
  Activity,
  TrendingUp,
} from "lucide-react";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { QueueList } from "@/components/QueueList";
import { UploadBookModal } from "@/components/UploadBookModal";
import { PageLoader, EmptyState } from "@/components/ui/spinner";
import {
  booksApi,
  videosApi,
} from "@/lib/api";
import { usePolling, useFetch } from "@/hooks/use-fetch";
import {
  SUBJECT_LABELS,
  SUBJECT_ICONS,
  GRADE_LABELS,
  formatRelative,
} from "@/lib/utils";
import type { BookListItem, QueueResponse } from "@/lib/types";

export default function DashboardPage() {
  const [showUpload, setShowUpload] = React.useState(false);

  const {
    data: books,
    loading: booksLoading,
    refetch: refetchBooks,
  } = useFetch<BookListItem[]>(() => booksApi.list(), []);

  const { data: queue } = usePolling<QueueResponse>(
    () => videosApi.getQueue(),
    5000,
  );

  const totalLessons = books?.reduce((sum, b) => sum + b.total_lessons, 0) ?? 0;
  const totalVideos = books?.reduce((sum, b) => sum + b.videos_generated, 0) ?? 0;
  const pendingVideos =
    (queue?.active_jobs.length ?? 0) + (queue?.pending_queue.length ?? 0);

  const recentBooks = (books ?? [])
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <>
      <Header
        title="لوحة التحكم"
        description="نظرة عامة على نظام مصنع الفيديو الموحد"
        actions={
          <Button size="sm" onClick={() => setShowUpload(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">رفع كتاب</span>
          </Button>
        }
      />
      <main className="flex-1 p-4 md:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatsCard
            title="إجمالي الكتب"
            value={books?.length ?? 0}
            icon={BookOpen}
            accent="emerald"
            loading={booksLoading}
            hint="كتاب في النظام"
            href="/books"
          />
          <StatsCard
            title="إجمالي الدروس"
            value={totalLessons}
            icon={FileText}
            accent="blue"
            loading={booksLoading}
            hint="درس في كل الكتب"
          />
          <StatsCard
            title="فيديوهات مُولّدة"
            value={totalVideos}
            icon={Film}
            accent="violet"
            loading={booksLoading}
            hint="فيديو جاهز"
            href="/videos"
          />
          <StatsCard
            title="في قائمة الانتظار"
            value={pendingVideos}
            icon={Clock}
            accent="amber"
            hint={queue ? `نشط: ${queue.active_jobs.length}` : undefined}
          />
        </div>

        {/* Recent books + Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                أحدث الكتب
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link href="/books">
                  عرض الكل
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            {booksLoading ? (
              <PageLoader />
            ) : recentBooks.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="h-10 w-10" />}
                title="لا توجد كتب بعد"
                description="ابدأ برفع أول كتاب PDF لاستخراج محتواه"
                action={
                  <Button onClick={() => setShowUpload(true)}>
                    <Plus className="h-4 w-4" />
                    رفع كتاب
                  </Button>
                }
              />
            ) : (
              <div className="space-y-2">
                {recentBooks.map((book) => (
                  <Link
                    key={book.id}
                    href={`/books/${book.id}`}
                    className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/30 p-3 transition-colors hover:bg-slate-900/60 hover:border-slate-700"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-800/60 border border-slate-700 text-lg">
                      {SUBJECT_ICONS[book.subject]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {book.title}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                        <span>{SUBJECT_LABELS[book.subject]}</span>
                        <span className="text-slate-600">•</span>
                        <span>{GRADE_LABELS[book.grade]}</span>
                        <span className="text-slate-600">•</span>
                        <span>{formatRelative(book.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 w-28">
                      <StatusBadge
                        status={book.extraction_status}
                        className="text-[10px]"
                        pulse={book.extraction_status === "extracting"}
                      />
                      <ProgressBar
                        value={book.extraction_progress}
                        size="sm"
                        showLabel
                      />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <QueueList queue={queue} loading={!queue} />
        </div>

        {/* Activity overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">إحصائيات الإنتاج</h3>
            </div>
            <div className="space-y-2.5">
              <ActivityRow
                label="معدل الإنجاز"
                value={
                  totalLessons
                    ? `${Math.round((totalVideos / totalLessons) * 100)}%`
                    : "—"
                }
              />
              <ActivityRow
                label="متوسط الدروس لكل كتاب"
                value={
                  books?.length
                    ? Math.round(totalLessons / books.length).toString()
                    : "—"
                }
              />
              <ActivityRow
                label="مهام مكتملة اليوم"
                value={queue?.completed.length ?? 0}
              />
              <ActivityRow
                label="مهام فاشلة"
                value={queue?.failed.length ?? 0}
                warn={(queue?.failed.length ?? 0) > 0}
              />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">النشاط الحالي</h3>
            </div>
            {queue?.active_jobs.length ? (
              <div className="space-y-2">
                {queue.active_jobs.map((job) => (
                  <div
                    key={job.lesson_id}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                    </span>
                    <span className="truncate flex-1">{job.lesson_title}</span>
                    <StatusBadge status={job.status} className="text-[10px]" />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="لا يوجد نشاط حالياً"
                description="المعالج خامل في انتظار المهام"
              />
            )}
          </Card>
        </div>
      </main>

      <UploadBookModal
        open={showUpload}
        onOpenChange={setShowUpload}
        onUploaded={refetchBooks}
      />
    </>
  );
}

function ActivityRow({
  label,
  value,
  warn,
}: {
  label: string;
  value: React.ReactNode;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`font-semibold tabular-nums ${warn ? "text-rose-400" : "text-foreground"}`}
      >
        {value}
      </span>
    </div>
  );
}
