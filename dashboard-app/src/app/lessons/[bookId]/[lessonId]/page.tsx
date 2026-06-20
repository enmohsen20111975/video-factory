"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Save,
  Film,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
  Play,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextEditor } from "@/components/editor/TextEditor";
import { ImageManager } from "@/components/editor/ImageManager";
import { TableEditor } from "@/components/editor/TableEditor";
import { FormulaEditor } from "@/components/editor/FormulaEditor";
import { QuestionEditor } from "@/components/editor/QuestionEditor";
import { VideoPlayer } from "@/components/VideoPlayer";
import { PageLoader, EmptyState } from "@/components/ui/spinner";
import { lessonsApi, videosApi, videoFileUrl } from "@/lib/api";
import { useFetch } from "@/hooks/use-fetch";
import { useAsyncAction } from "@/hooks/use-async-action";
import {
  SUBJECT_LABELS,
  GRADE_LABELS,
  formatDuration,
  formatRelative,
} from "@/lib/utils";
import type { Lesson, LessonContent, LessonImage, LessonTable, Formula, Question } from "@/lib/types";

export default function LessonEditorPage({
  params,
}: {
  params: Promise<{ bookId: string; lessonId: string }>;
}) {
  const router = useRouter();
  const { bookId, lessonId } = React.use(params);
  const { run: actionRun } = useAsyncAction();

  const {
    data: lesson,
    loading,
    refetch,
  } = useFetch<Lesson>(() => lessonsApi.get(bookId, lessonId), [bookId, lessonId]);

  const [draft, setDraft] = React.useState<Lesson | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // sync draft when lesson loads
  React.useEffect(() => {
    if (lesson && !draft) {
      setDraft(lesson);
      setDirty(false);
    }
  }, [lesson, draft]);

  const update = (patch: Partial<Lesson>) => {
    if (!draft) return;
    setDraft({ ...draft, ...patch });
    setDirty(true);
  };

  const updateContent = (patch: Partial<LessonContent>) => {
    if (!draft) return;
    update({ content: { ...draft.content, ...patch } });
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await lessonsApi.update(bookId, lessonId, draft);
      setDirty(false);
      refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateVideo = () => {
    actionRun(
      () => videosApi.generate(bookId, lessonId),
      {
        successMessage: "تمت إضافة الدرس إلى قائمة انتظار الفيديو",
      },
    );
  };

  if (loading) {
    return (
      <>
        <Header title="محرر الدرس" />
        <PageLoader />
      </>
    );
  }

  if (!lesson || !draft) {
    return (
      <>
        <Header title="الدرس غير موجود" />
        <Card className="m-6 p-8">
          <EmptyState
            icon={<AlertCircle className="h-10 w-10" />}
            title="لم يتم العثور على الدرس"
            description={`الدرس ${lessonId} في الكتاب ${bookId}`}
            action={
              <Button asChild variant="outline">
                <Link href={`/books/${bookId}`}>
                  <ArrowRight className="h-4 w-4" />
                  العودة للكتاب
                </Link>
              </Button>
            }
          />
        </Card>
      </>
    );
  }

  const { metadata, content, images, tables, questions, video } = draft;
  const { formulas } = content;
  const videoUrl = video.video_url
    ? video.video_url.startsWith("http")
      ? video.video_url
      : videoFileUrl(bookId, lessonId)
    : null;

  return (
    <>
      <Header
        title={metadata.title}
        description={`${SUBJECT_LABELS[metadata.subject] ?? metadata.subject} • ${GRADE_LABELS[metadata.grade] ?? metadata.grade}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={!dirty || saving}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : dirty ? (
                <Save className="h-3.5 w-3.5" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              )}
              <span className="hidden sm:inline">
                {dirty ? "حفظ" : "محفوظ"}
              </span>
            </Button>
            <Button size="sm" onClick={handleGenerateVideo}>
              <Film className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">توليد الفيديو</span>
            </Button>
          </div>
        }
      />

      <main className="flex-1 p-4 md:p-6 space-y-4">
        {/* Breadcrumb + meta */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link href={`/books/${bookId}`} className="hover:text-foreground">
              {metadata.book_id}
            </Link>
            <ArrowLeft className="h-3 w-3" />
            <span>{metadata.unit_id}</span>
            <ArrowLeft className="h-3 w-3" />
            <span className="text-foreground font-medium">
              {metadata.title}
            </span>
          </nav>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>صفحة {metadata.page_start}-{metadata.page_end}</span>
            <span className="text-slate-600">•</span>
            <span>{formatDuration(metadata.duration_minutes * 60)}</span>
            <span className="text-slate-600">•</span>
            <StatusBadge status={video.status} className="text-[10px]" />
            {dirty && (
              <Badge variant="warning" className="text-[10px]">
                غير محفوظ
              </Badge>
            )}
          </div>
        </div>

        {/* Review status banner */}
        <Card className="p-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-3">
              <StatusBadge
                status={
                  draft.extraction_meta.needs_review ? "extracted" : "reviewed"
                }
              />
              <span className="text-muted-foreground">
                {draft.extraction_meta.needs_review
                  ? "يحتاج مراجعة"
                  : "تمت المراجعة"}
              </span>
              <span className="text-xs text-muted-foreground">
                • آخر تحديث {formatRelative(metadata.updated_at)}
              </span>
              <span className="text-xs text-muted-foreground">
                • الثقة: {Math.round(draft.extraction_meta.confidence * 100)}%
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                actionRun(
                  () => lessonsApi.markReviewed(bookId, lessonId),
                  {
                    successMessage: "تم تعليم الدرس كمُراجَع",
                    onSuccess: refetch,
                  },
                )
              }
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              تعليم كمُراجَع
            </Button>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="content">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="content">📝 المحتوى</TabsTrigger>
            <TabsTrigger value="images">
              🖼️ الصور
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 mr-1">
                {images.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="tables">
              📊 الجداول
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 mr-1">
                {tables.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="formulas">
              🧮 الصيغ
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 mr-1">
                {formulas.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="questions">
              ❓ الأسئلة
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 mr-1">
                {questions.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="video">🎬 الفيديو</TabsTrigger>
          </TabsList>

          <TabsContent value="content">
            <Card className="p-5">
              <TextEditor
                rawText={content.raw_text}
                summary={content.summary}
                objectives={content.objectives}
                onChange={(next) => updateContent(next)}
                onSave={handleSave}
                saving={saving}
                dirty={dirty}
              />
            </Card>
          </TabsContent>

          <TabsContent value="images">
            <Card className="p-5">
              <ImageManager
                bookId={bookId}
                lessonId={lessonId}
                images={images}
                onChange={(imgs: LessonImage[]) => update({ images: imgs })}
              />
            </Card>
          </TabsContent>

          <TabsContent value="tables">
            <Card className="p-5">
              <TableEditor
                tables={tables}
                onChange={(t: LessonTable[]) => update({ tables: t })}
              />
            </Card>
          </TabsContent>

          <TabsContent value="formulas">
            <Card className="p-5">
              <FormulaEditor
                formulas={formulas}
                onChange={(f: Formula[]) => updateContent({ formulas: f })}
              />
            </Card>
          </TabsContent>

          <TabsContent value="questions">
            <Card className="p-5">
              <QuestionEditor
                questions={questions}
                onChange={(q: Question[]) => update({ questions: q })}
              />
            </Card>
          </TabsContent>

          <TabsContent value="video">
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">الفيديو</h3>
                  <p className="text-xs text-muted-foreground">
                    الحالة:{" "}
                    <StatusBadge status={video.status} className="text-[10px]" />
                  </p>
                </div>
                <Button onClick={handleGenerateVideo}>
                  <Film className="h-4 w-4" />
                  توليد الفيديو
                </Button>
              </div>

              {/* Script preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">السكريبت الصوتي</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      update({
                        video: {
                          ...video,
                          script_text: generateScript(draft),
                        },
                      })
                    }
                  >
                    إعادة توليد
                  </Button>
                </div>
                <textarea
                  value={video.script_text}
                  onChange={(e) =>
                    update({
                      video: { ...video, script_text: e.target.value },
                    })
                  }
                  rows={6}
                  dir="rtl"
                  className="w-full rounded-md border border-slate-700 bg-slate-900/60 p-3 text-sm font-mono"
                />
              </div>

              {/* Video player */}
              {videoUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">الفيديو المُولّد</h4>
                    <a
                      href={videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      فتح في نافذة
                    </a>
                  </div>
                  <VideoPlayer
                    src={videoUrl}
                    downloadUrl={videoUrl}
                    poster={video.thumbnail_url ?? undefined}
                  />
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div>
                      المدة: <span className="text-foreground">{formatDuration(video.duration_sec)}</span>
                    </div>
                    <div>
                      الحجم:{" "}
                      <span className="text-foreground">
                        {video.file_size_mb ? `${video.file_size_mb.toFixed(1)} MB` : "—"}
                      </span>
                    </div>
                    <div>
                      الصوت: <span className="text-foreground" dir="ltr">{video.voice}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-slate-700 p-8 text-center">
                  <Play className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">لم يتم توليد الفيديو بعد</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    اضغط «توليد الفيديو» لبدء العملية
                  </p>
                </div>
              )}

              {/* Render log */}
              {video.render_log && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">سجل الريندر</h4>
                  <pre
                    className="max-h-48 overflow-auto rounded-md border border-slate-800 bg-slate-950 p-3 text-[11px] font-mono text-muted-foreground"
                    dir="ltr"
                  >
                    {video.render_log}
                  </pre>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}

function generateScript(lesson: Lesson): string {
  const { metadata, content } = lesson;
  const lines: string[] = [];
  lines.push(`أهلاً بكم في درس ${metadata.title}.`);
  if (content.summary) lines.push(content.summary);
  if (content.objectives.length) {
    lines.push("في هذا الدرس سنتعلم:");
    content.objectives.forEach((o, i) => lines.push(`${i + 1}. ${o}`));
  }
  content.definitions.forEach((d) => {
    lines.push(`${d.term}: ${d.definition}`);
  });
  if (content.formulas.length) {
    lines.push("الصيغ الرياضية المهمة:");
    content.formulas.forEach((f) => {
      lines.push(`${f.description}: ${f.latex}`);
    });
  }
  lines.push("شكراً لمتابعتكم، نلقاكم في درس آخر.");
  return lines.join("\n\n");
}
