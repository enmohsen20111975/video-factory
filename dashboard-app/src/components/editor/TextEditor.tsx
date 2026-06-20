"use client";

import * as React from "react";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Code,
  Quote,
  Sigma,
  Eye,
  Pencil,
  CheckCircle2,
  Loader2,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { KatexRenderer } from "@/components/ui/katex";

interface TextEditorProps {
  rawText: string;
  summary: string;
  objectives: string[];
  onChange: (next: { rawText?: string; summary?: string; objectives?: string[] }) => void;
  onSave?: () => Promise<void> | void;
  saving?: boolean;
  dirty?: boolean;
}

type ViewMode = "edit" | "preview";

function renderMarkdownInline(text: string): React.ReactNode {
  // Very simple inline markdown: bold **, italic *, code `, latex $...$
  const parts: React.ReactNode[] = [];
  // regex matches: $$...$$ | $...$ | **...** | *...* | `...`
  const regex =
    /(\$\$[^$]+\$\$|\$[^$]+\$|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("$$")) {
      parts.push(
        <KatexRenderer
          key={i++}
          latex={token.slice(2, -2)}
          display
        />,
      );
    } else if (token.startsWith("$")) {
      parts.push(
        <KatexRenderer key={i++} latex={token.slice(1, -1)} />,
      );
    } else if (token.startsWith("**")) {
      parts.push(<strong key={i++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      parts.push(<em key={i++}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("`")) {
      parts.push(
        <code
          key={i++}
          className="rounded bg-slate-800 px-1 py-0.5 text-xs font-mono text-primary"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let listBuffer: React.ReactNode[] = [];
  let listType: "ul" | "ol" | null = null;
  let paraBuffer: string[] = [];

  const flushPara = () => {
    if (paraBuffer.length) {
      blocks.push(
        <p key={`p-${blocks.length}`} className="my-1.5 leading-7">
          {renderMarkdownInline(paraBuffer.join(" "))}
        </p>,
      );
      paraBuffer = [];
    }
  };
  const flushList = () => {
    if (listBuffer.length) {
      if (listType === "ul") {
        blocks.push(
          <ul key={`ul-${blocks.length}`} className="my-1.5 list-disc pr-5 space-y-1">
            {listBuffer}
          </ul>,
        );
      } else if (listType === "ol") {
        blocks.push(
          <ol key={`ol-${blocks.length}`} className="my-1.5 list-decimal pr-5 space-y-1">
            {listBuffer}
          </ol>,
        );
      }
      listBuffer = [];
      listType = null;
    }
  };

  lines.forEach((line, idx) => {
    if (!line.trim()) {
      flushPara();
      flushList();
      return;
    }
    if (line.startsWith("# ")) {
      flushPara();
      flushList();
      blocks.push(
        <h1 key={`h1-${idx}`} className="text-lg font-bold mt-3 mb-1">
          {renderMarkdownInline(line.slice(2))}
        </h1>,
      );
    } else if (line.startsWith("## ")) {
      flushPara();
      flushList();
      blocks.push(
        <h2 key={`h2-${idx}`} className="text-base font-semibold mt-2 mb-1">
          {renderMarkdownInline(line.slice(3))}
        </h2>,
      );
    } else if (line.startsWith("> ")) {
      flushPara();
      flushList();
      blocks.push(
        <blockquote
          key={`q-${idx}`}
          className="my-2 border-r-2 border-primary pr-3 italic text-muted-foreground"
        >
          {renderMarkdownInline(line.slice(2))}
        </blockquote>,
      );
    } else if (line.match(/^\d+\.\s/)) {
      flushPara();
      if (listType && listType !== "ol") flushList();
      listType = "ol";
      listBuffer.push(
        <li key={`li-${idx}`}>{renderMarkdownInline(line.replace(/^\d+\.\s/, ""))}</li>,
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      flushPara();
      if (listType && listType !== "ul") flushList();
      listType = "ul";
      listBuffer.push(
        <li key={`li-${idx}`}>{renderMarkdownInline(line.slice(2))}</li>,
      );
    } else {
      flushList();
      paraBuffer.push(line);
    }
  });
  flushPara();
  flushList();
  return blocks;
}

const TOOLBAR = [
  { icon: Bold, label: "Bold", prefix: "**", suffix: "**", placeholder: "نص عريض" },
  { icon: Italic, label: "Italic", prefix: "*", suffix: "*", placeholder: "نص مائل" },
  { icon: Heading1, label: "H1", prefix: "# ", suffix: "", placeholder: "عنوان 1" },
  { icon: Heading2, label: "H2", prefix: "## ", suffix: "", placeholder: "عنوان 2" },
  { icon: List, label: "UL", prefix: "- ", suffix: "", placeholder: "عنصر قائمة" },
  { icon: ListOrdered, label: "OL", prefix: "1. ", suffix: "", placeholder: "عنصر قائمة مرقمة" },
  { icon: Quote, label: "Quote", prefix: "> ", suffix: "", placeholder: "اقتباس" },
  { icon: Code, label: "Code", prefix: "`", suffix: "`", placeholder: "كود" },
  { icon: Sigma, label: "Math", prefix: "$", suffix: "$", placeholder: "x^2" },
];

export function TextEditor({
  rawText,
  summary,
  objectives,
  onChange,
  onSave,
  saving,
  dirty,
}: TextEditorProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = React.useState<ViewMode>("edit");

  const insertAround = (prefix: string, suffix: string, placeholder: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.slice(start, end) || placeholder;
    const newText =
      ta.value.slice(0, start) + prefix + selected + suffix + ta.value.slice(end);
    onChange({ rawText: newText });
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + prefix.length;
      ta.setSelectionRange(pos, pos + selected.length);
    });
  };

  const addObjective = () => {
    onChange({ objectives: [...objectives, ""] });
  };

  const updateObjective = (i: number, v: string) => {
    const next = [...objectives];
    next[i] = v;
    onChange({ objectives: next });
  };

  const removeObjective = (i: number) => {
    onChange({ objectives: objectives.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="space-y-2">
        <Label>الملخص</Label>
        <Textarea
          value={summary}
          onChange={(e) => onChange({ summary: e.target.value })}
          placeholder="ملخص مختصر للدرس..."
          rows={2}
          dir="rtl"
        />
      </div>

      {/* Objectives */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>أهداف الدرس</Label>
          <Button size="sm" variant="outline" onClick={addObjective}>
            + إضافة هدف
          </Button>
        </div>
        <div className="space-y-2">
          {objectives.length === 0 && (
            <p className="text-xs text-muted-foreground">لا توجد أهداف بعد</p>
          )}
          {objectives.map((obj, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
              <Input
                value={obj}
                onChange={(e) => updateObjective(i, e.target.value)}
                placeholder="هدف الدرس..."
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-rose-400"
                onClick={() => removeObjective(i)}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-800 pt-4">
        <div className="flex items-center justify-between mb-2">
          <Label>النص الكامل (Markdown + LaTeX)</Label>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md border border-slate-800 bg-slate-900/40 p-0.5">
              <Button
                size="sm"
                variant={mode === "edit" ? "secondary" : "ghost"}
                className="h-7"
                onClick={() => setMode("edit")}
              >
                <Pencil className="h-3.5 w-3.5" />
                تحرير
              </Button>
              <Button
                size="sm"
                variant={mode === "preview" ? "secondary" : "ghost"}
                className="h-7"
                onClick={() => setMode("preview")}
              >
                <Eye className="h-3.5 w-3.5" />
                معاينة
              </Button>
            </div>
            {onSave && (
              <Button
                size="sm"
                variant={dirty ? "success" : "outline"}
                onClick={onSave}
                disabled={saving || !dirty}
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                حفظ
              </Button>
            )}
          </div>
        </div>

        {mode === "edit" ? (
          <>
            <div className="mb-2 flex flex-wrap gap-1 rounded-md border border-slate-800 bg-slate-900/40 p-1.5">
              {TOOLBAR.map((t) => (
                <Button
                  key={t.label}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => insertAround(t.prefix, t.suffix, t.placeholder)}
                  title={t.label}
                >
                  <t.icon className="h-3.5 w-3.5" />
                </Button>
              ))}
            </div>
            <Textarea
              ref={textareaRef}
              value={rawText}
              onChange={(e) => onChange({ rawText: e.target.value })}
              placeholder="## عنوان الدرس&#10;&#10;اكتب النص هنا... استخدم **عريض**، *مائل*، `$x^2$` للصيغ الرياضية."
              rows={16}
              className="font-mono text-sm ltr-text"
              dir="ltr"
            />
          </>
        ) : (
          <div className="min-h-[300px] rounded-md border border-slate-800 bg-slate-950/60 p-4 text-sm leading-7 overflow-auto max-h-[600px]">
            {rawText ? (
              renderMarkdown(rawText)
            ) : (
              <p className="text-muted-foreground italic">لا يوجد محتوى للمعاينة</p>
            )}
          </div>
        )}
      </div>

      {dirty !== undefined && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : dirty ? (
            <span className="text-amber-400">● تغييرات غير محفوظة</span>
          ) : (
            <>
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span>محفوظ</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
