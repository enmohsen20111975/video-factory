import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  const now = Date.now();
  const diff = now - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "منذ ثوانٍ";
  const min = Math.floor(sec / 60);
  if (min < 60) return `منذ ${min} دقيقة`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `منذ ${hr} ساعة`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `منذ ${day} يوم`;
  return formatDate(d);
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function formatDuration(sec: number | null | undefined): string {
  if (sec == null) return "—";
  if (sec < 60) return `${Math.round(sec)} ث`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const SUBJECT_LABELS: Record<string, string> = {
  physics: "الفيزياء",
  chemistry: "الكيمياء",
  biology: "الأحياء",
  math: "الرياضيات",
  geography: "الجغرافيا",
  arabic: "اللغة العربية",
  english: "اللغة الإنجليزية",
  history: "التاريخ",
  philosophy: "الفلسفة",
  other: "أخرى",
};

export const SUBJECT_ICONS: Record<string, string> = {
  physics: "⚛️",
  chemistry: "🧪",
  biology: "🧬",
  math: "📐",
  geography: "🌍",
  arabic: "ع",
  english: "EN",
  history: "📜",
  philosophy: "💭",
  other: "📚",
};

export const GRADE_LABELS: Record<string, string> = {
  "1st-prep": "الأول الإعدادي",
  "2nd-prep": "الثاني الإعدادي",
  "3rd-prep": "الثالث الإعدادي",
  "1st-secondary": "الأول الثانوي",
  "2nd-secondary": "الثاني الثانوي",
  "3rd-secondary": "الثالث الثانوي",
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار",
  extracting: "جاري الاستخراج",
  completed: "مكتمل",
  failed: "فشل",
  partial: "جزئي",
  extracted: "مستخرَج",
  reviewed: "مُراجَع",
  video_generating: "جاري توليد الفيديو",
  video_generated: "تم توليد الفيديو",
  not_generated: "لم يُولّد",
  generating: "جاري التوليد",
  cancelled: "ملغي",
  processing: "قيد المعالجة",
};

export function truncate(str: string, max: number): string {
  if (!str) return "";
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "…";
}
