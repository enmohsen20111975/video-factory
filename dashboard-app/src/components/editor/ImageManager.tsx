"use client";

import * as React from "react";
import { Upload, Trash2, ImageIcon, Loader2, Plus, X, Edit3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { lessonsApi, imageUrl } from "@/lib/api";
import type { LessonImage } from "@/lib/types";

interface ImageManagerProps {
  bookId: string;
  lessonId: string;
  images: LessonImage[];
  onChange: (images: LessonImage[]) => void;
}

const IMAGE_TYPES: LessonImage["type"][] = [
  "circuit",
  "graph",
  "diagram",
  "photo",
  "illustration",
  "other",
];

const TYPE_LABELS: Record<string, string> = {
  circuit: "دائرة",
  graph: "رسم بياني",
  diagram: "مخطط",
  photo: "صورة",
  illustration: "رسم توضيحي",
  other: "أخرى",
};

export function ImageManager({
  bookId,
  lessonId,
  images,
  onChange,
}: ImageManagerProps) {
  const [uploading, setUploading] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editDesc, setEditDesc] = React.useState("");
  const [editType, setEditType] = React.useState<LessonImage["type"]>("other");
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const result = await lessonsApi.uploadImage(bookId, lessonId, file);
        if (result.data) {
          const newImg: LessonImage = {
            id: result.data.image_id,
            source_page: 0,
            path: result.data.path,
            description: "",
            type: "other",
          };
          onChange([...images, newImg]);
        }
      }
      toast.success(`تم رفع ${files.length} صورة`);
    } catch (err) {
      toast.error("فشل رفع الصورة: " + (err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (imgId: string) => {
    try {
      await lessonsApi.deleteImage(bookId, lessonId, imgId);
      onChange(images.filter((i) => i.id !== imgId));
      toast.success("تم حذف الصورة");
    } catch (err) {
      toast.error("فشل حذف الصورة: " + (err as Error).message);
    }
  };

  const startEdit = (img: LessonImage) => {
    setEditingId(img.id);
    setEditDesc(img.description);
    setEditType(img.type);
  };

  const saveEdit = () => {
    if (!editingId) return;
    onChange(
      images.map((i) =>
        i.id === editingId
          ? { ...i, description: editDesc, type: editType }
          : i,
      ),
    );
    setEditingId(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {images.length} صورة في هذا الدرس
        </p>
        <Button
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          رفع صورة
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {images.length === 0 ? (
        <div
          className="rounded-lg border-2 border-dashed border-slate-700 p-12 text-center cursor-pointer hover:border-slate-600 hover:bg-slate-900/40 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">اسحب وأفلت الصور هنا</p>
          <p className="text-xs text-muted-foreground mt-1">
            أو انقر للاختيار من الجهاز
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map((img) => (
            <Card key={img.id} className="overflow-hidden group">
              <div className="relative aspect-square bg-slate-900 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl(bookId, img.path)}
                  alt={img.description}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-7 w-7"
                    onClick={() => startEdit(img)}
                    title="تعديل"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-7 w-7"
                    onClick={() => handleDelete(img.id)}
                    title="حذف"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Badge variant="secondary" className="absolute top-1 left-1 text-[9px] px-1.5 py-0 bg-black/70 text-white border-0">
                  {TYPE_LABELS[img.type]}
                </Badge>
                {img.source_page > 0 && (
                  <span className="absolute top-1 right-1 rounded bg-black/70 text-white text-[9px] px-1.5 py-0.5">
                    ص {img.source_page}
                  </span>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
                  {img.description || "بدون وصف"}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editingId} onOpenChange={(v) => !v && setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل بيانات الصورة</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
                placeholder="وصف الصورة..."
              />
            </div>
            <div className="space-y-2">
              <Label>النوع</Label>
              <Select value={editType} onValueChange={(v) => setEditType(v as LessonImage["type"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              إلغاء
            </Button>
            <Button onClick={saveEdit}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
