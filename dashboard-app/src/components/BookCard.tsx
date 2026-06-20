"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Trash2,
  Play,
  Square,
  FileText,
  Film,
  MoreVertical,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  SUBJECT_LABELS,
  SUBJECT_ICONS,
  GRADE_LABELS,
  formatRelative,
} from "@/lib/utils";
import { booksApi } from "@/lib/api";
import type { BookListItem } from "@/lib/types";

interface BookCardProps {
  book: BookListItem;
  onChanged?: () => void;
}

export function BookCard({ book, onChanged }: BookCardProps) {
  const router = useRouter();
  const [showDelete, setShowDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState<"start" | "stop" | null>(null);

  const isExtracting = book.extraction_status === "extracting";
  const isCompleted = book.extraction_status === "completed";
  const isPending = book.extraction_status === "pending";

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await booksApi.remove(book.id);
      toast.success("تم حذف الكتاب");
      setShowDelete(false);
      onChanged?.();
    } catch (err) {
      toast.error("فشل حذف الكتاب: " + (err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const handleStartExtraction = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setActionLoading("start");
    try {
      await booksApi.startExtraction(book.id);
      toast.success("تم بدء الاستخراج");
      onChanged?.();
    } catch (err) {
      toast.error("فشل بدء الاستخراج: " + (err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopExtraction = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setActionLoading("stop");
    try {
      await booksApi.stopExtraction(book.id);
      toast.success("تم إيقاف الاستخراج");
      onChanged?.();
    } catch (err) {
      toast.error("فشل إيقاف الاستخراج: " + (err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <Card
        className="group relative overflow-hidden p-5 transition-all hover:border-slate-700 hover:shadow-lg cursor-pointer"
        onClick={() => router.push(`/books/${book.id}`)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-800/60 border border-slate-700 text-2xl">
              {SUBJECT_ICONS[book.subject] ?? "📚"}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground truncate" title={book.title}>
                {book.title}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <Badge variant="secondary" className="text-[10px]">
                  {SUBJECT_LABELS[book.subject]}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {GRADE_LABELS[book.grade]}
                </Badge>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mr-1 -mt-1 opacity-60 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem asChild>
                <Link href={`/books/${book.id}`}>
                  <BookOpen className="h-4 w-4 ml-2" />
                  <span>فتح الكتاب</span>
                </Link>
              </DropdownMenuItem>
              {isPending && (
                <DropdownMenuItem onClick={handleStartExtraction}>
                  <Play className="h-4 w-4 ml-2" />
                  <span>بدء الاستخراج</span>
                </DropdownMenuItem>
              )}
              {isExtracting && (
                <DropdownMenuItem onClick={handleStopExtraction}>
                  <Square className="h-4 w-4 ml-2" />
                  <span>إيقاف الاستخراج</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href={`/videos?book=${book.id}`}>
                  <Film className="h-4 w-4 ml-2" />
                  <span>استوديو الفيديو</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-rose-400 focus:text-rose-300"
                onClick={() => setShowDelete(true)}
              >
                <Trash2 className="h-4 w-4 ml-2" />
                <span>حذف الكتاب</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            {book.total_pages} صفحة
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {book.total_lessons} درس
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1">
            <Film className="h-3.5 w-3.5" />
            {book.videos_generated} فيديو
          </span>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <StatusBadge
            status={book.extraction_status}
            pulse={isExtracting}
            className="text-[11px]"
          />
          <div className="flex-1">
            <ProgressBar
              value={book.extraction_progress}
              size="sm"
              showLabel
            />
          </div>
        </div>

        {(isPending || isExtracting) && (
          <div className="mt-3 flex gap-2">
            {isPending && (
              <Button
                size="sm"
                variant="success"
                className="flex-1"
                onClick={handleStartExtraction}
                disabled={actionLoading === "start"}
              >
                {actionLoading === "start" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                بدء الاستخراج
              </Button>
            )}
            {isExtracting && (
              <Button
                size="sm"
                variant="warning"
                className="flex-1"
                onClick={handleStopExtraction}
                disabled={actionLoading === "stop"}
              >
                {actionLoading === "stop" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Square className="h-3.5 w-3.5" />
                )}
                إيقاف
              </Button>
            )}
          </div>
        )}

        <p className="mt-3 text-[10px] text-muted-foreground/70">
          رُفع {formatRelative(book.created_at)}
        </p>
      </Card>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد حذف الكتاب</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف «{book.title}»؟ سيتم حذف جميع الدروس والفيديوهات
              والصور المرتبطة به. لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDelete(false)}
              disabled={deleting}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              حذف نهائي
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
