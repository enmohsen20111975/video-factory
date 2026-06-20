"use client";

import * as React from "react";
import { Upload, FileText, X, Loader2, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { SUBJECT_LABELS, GRADE_LABELS } from "@/lib/utils";
import { booksApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface UploadBookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded?: () => void;
}

const SUBJECTS = Object.entries(SUBJECT_LABELS).filter(([k]) => k !== "other");
const GRADES = Object.entries(GRADE_LABELS);

export function UploadBookModal({
  open,
  onOpenChange,
  onUploaded,
}: UploadBookModalProps) {
  const [title, setTitle] = React.useState("");
  const [subject, setSubject] = React.useState("physics");
  const [grade, setGrade] = React.useState("3rd-secondary");
  const [publisher, setPublisher] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const reset = () => {
    setTitle("");
    setSubject("physics");
    setGrade("3rd-secondary");
    setPublisher("");
    setFile(null);
    setDragging(false);
  };

  const handleFile = (f: File | undefined) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("الملف يجب أن يكون بصيغة PDF");
      return;
    }
    if (f.size > 200 * 1024 * 1024) {
      toast.error("حجم الملف يجب ألا يتجاوز 200 ميجابايت");
      return;
    }
    setFile(f);
    // auto-fill title if empty
    if (!title) {
      const baseName = f.name.replace(/\.pdf$/i, "");
      setTitle(baseName);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error("اختر ملف PDF");
      return;
    }
    if (!title.trim()) {
      toast.error("أدخل عنوان الكتاب");
      return;
    }

    setUploading(true);
    try {
      const result = await booksApi.upload(file, {
        title: title.trim(),
        subject,
        grade,
        publisher: publisher.trim() || undefined,
      });
      toast.success(
        `تم رفع الكتاب بنجاح (${result.total_pages ?? "?"} صفحة)`,
      );
      reset();
      onOpenChange(false);
      onUploaded?.();
    } catch (err) {
      toast.error("فشل رفع الكتاب: " + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!uploading) {
          onOpenChange(v);
          if (!v) reset();
        }
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            رفع كتاب جديد
          </DialogTitle>
          <DialogDescription>
            ارفع ملف PDF ممسوح ضوئياً ليتم استخراج محتواه تلقائياً.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="book-title">عنوان الكتاب *</Label>
            <Input
              id="book-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: الفيزياء للصف الثالث الثانوي"
              disabled={uploading}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>المادة *</Label>
              <Select value={subject} onValueChange={setSubject} disabled={uploading}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المادة" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>الصف *</Label>
              <Select value={grade} onValueChange={setGrade} disabled={uploading}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الصف" />
                </SelectTrigger>
                <SelectContent>
                  {GRADES.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="book-publisher">الناشر (اختياري)</Label>
            <Input
              id="book-publisher"
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
              placeholder="مثال: المعاصر، الدار المصرية"
              disabled={uploading}
            />
          </div>

          <div className="grid gap-2">
            <Label>ملف PDF *</Label>
            {!file ? (
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                  dragging
                    ? "border-primary bg-primary/5"
                    : "border-slate-700 hover:border-slate-600 hover:bg-slate-900/40",
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => document.getElementById("pdf-input")?.click()}
              >
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">
                  اسحب وأفلت ملف PDF هنا
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  أو انقر للاختيار من الجهاز (الحد الأقصى 200MB)
                </p>
                <input
                  id="pdf-input"
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/40 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {!uploading && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                {uploading && (
                  <CheckCircle2 className="h-4 w-4 text-primary animate-pulse" />
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              if (!uploading) {
                reset();
                onOpenChange(false);
              }
            }}
            disabled={uploading}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={uploading || !file || !title.trim()}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الرفع...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                رفع الكتاب
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
