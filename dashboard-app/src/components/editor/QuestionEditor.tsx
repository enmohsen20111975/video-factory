"use client";

import * as React from "react";
import { Plus, Trash2, HelpCircle, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Question, QuestionType, Difficulty } from "@/lib/types";

interface QuestionEditorProps {
  questions: Question[];
  onChange: (questions: Question[]) => void;
}

const QUESTION_TYPES: { value: QuestionType; label: string; emoji: string }[] = [
  { value: "mcq", label: "اختيار من متعدد", emoji: "🔘" },
  { value: "numerical", label: "رقمية", emoji: "🔢" },
  { value: "conceptual", label: "مفاهيمية", emoji: "💭" },
  { value: "true_false", label: "صح/خطأ", emoji: "✓" },
];

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "سهل" },
  { value: "medium", label: "متوسط" },
  { value: "hard", label: "صعب" },
];

const TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "اختيار من متعدد",
  numerical: "رقمية",
  conceptual: "مفاهيمية",
  true_false: "صح/خطأ",
};

function genId() {
  return `q-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function QuestionEditor({ questions, onChange }: QuestionEditorProps) {
  const addQuestion = (type: QuestionType) => {
    const newQ: Question = {
      id: genId(),
      type,
      difficulty: "medium",
      question: "",
      explanation: "",
      ...(type === "mcq"
        ? { options: ["", "", "", ""], correct_index: 0 }
        : {}),
      ...(type === "numerical" ? { answer: "" } : {}),
      ...(type === "true_false" ? { is_true: true } : {}),
    };
    onChange([...questions, newQ]);
  };

  const updateQuestion = (id: string, patch: Partial<Question>) => {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const removeQuestion = (id: string) => {
    onChange(questions.filter((q) => q.id !== id));
  };

  const changeType = (id: string, newType: QuestionType) => {
    const q = questions.find((x) => x.id === id);
    if (!q) return;
    const base: Question = {
      ...q,
      type: newType,
      // reset type-specific fields
      options: undefined,
      correct_index: undefined,
      answer: undefined,
      is_true: undefined,
    };
    if (newType === "mcq") {
      base.options = ["", "", "", ""];
      base.correct_index = 0;
    } else if (newType === "numerical") {
      base.answer = "";
    } else if (newType === "true_false") {
      base.is_true = true;
    }
    onChange(questions.map((x) => (x.id === id ? base : x)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          {questions.length} سؤال
        </p>
        <div className="flex items-center gap-1 flex-wrap">
          {QUESTION_TYPES.map((t) => (
            <Button
              key={t.value}
              size="sm"
              variant="outline"
              onClick={() => addQuestion(t.value)}
            >
              <span>{t.emoji}</span>
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-slate-700 p-12 text-center">
          <HelpCircle className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">لا توجد أسئلة بعد</p>
          <p className="text-xs text-muted-foreground mt-1">
            أضف سؤالاً جديداً من الأزرار في الأعلى
          </p>
        </div>
      ) : (
        questions.map((q, idx) => (
          <Card key={q.id} className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">س{idx + 1}</Badge>
                <Badge variant="info">{TYPE_LABELS[q.type]}</Badge>
                <Select
                  value={q.type}
                  onValueChange={(v) => changeType(q.id, v as QuestionType)}
                >
                  <SelectTrigger className="h-7 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.emoji} {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={q.difficulty}
                  onValueChange={(v) =>
                    updateQuestion(q.id, { difficulty: v as Difficulty })
                  }
                >
                  <SelectTrigger className="h-7 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-rose-400 h-7 w-7"
                  onClick={() => removeQuestion(q.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>نص السؤال</Label>
              <Textarea
                value={q.question}
                onChange={(e) =>
                  updateQuestion(q.id, { question: e.target.value })
                }
                rows={2}
                placeholder="اكتب السؤال هنا..."
              />
            </div>

            {/* Type-specific fields */}
            {q.type === "mcq" && (
              <div className="space-y-2">
                <Label>الخيارات (اضغط على الدائرة لتحديد الإجابة الصحيحة)</Label>
                <div className="space-y-1.5">
                  {q.options?.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuestion(q.id, { correct_index: i })
                        }
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full border-2 shrink-0 transition-colors",
                          q.correct_index === i
                            ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                            : "border-slate-700 text-transparent hover:border-slate-500",
                        )}
                      >
                        {q.correct_index === i && <Check className="h-3.5 w-3.5" />}
                      </button>
                      <Input
                        value={opt}
                        onChange={(e) => {
                          const options = [...(q.options ?? [])];
                          options[i] = e.target.value;
                          updateQuestion(q.id, { options });
                        }}
                        placeholder={`الخيار ${i + 1}`}
                        className="h-8"
                      />
                      {q.options && q.options.length > 2 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-rose-400 shrink-0"
                          onClick={() => {
                            const options = q.options!.filter(
                              (_, idx) => idx !== i,
                            );
                            const correct_index =
                              q.correct_index === i
                                ? 0
                                : q.correct_index! > i
                                  ? q.correct_index! - 1
                                  : q.correct_index;
                            updateQuestion(q.id, { options, correct_index });
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() =>
                    updateQuestion(q.id, {
                      options: [...(q.options ?? []), ""],
                    })
                  }
                >
                  <Plus className="h-3 w-3" />
                  إضافة خيار
                </Button>
              </div>
            )}

            {q.type === "numerical" && (
              <div className="grid gap-1.5">
                <Label>الإجابة</Label>
                <Input
                  value={q.answer ?? ""}
                  onChange={(e) =>
                    updateQuestion(q.id, { answer: e.target.value })
                  }
                  placeholder="مثال: 12V"
                  dir="ltr"
                  className="font-mono"
                />
              </div>
            )}

            {q.type === "true_false" && (
              <div className="flex items-center gap-3">
                <Label>الإجابة:</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={q.is_true ? "success" : "outline"}
                    onClick={() => updateQuestion(q.id, { is_true: true })}
                  >
                    <Check className="h-3.5 w-3.5" />
                    صحيح
                  </Button>
                  <Button
                    size="sm"
                    variant={!q.is_true ? "destructive" : "outline"}
                    onClick={() => updateQuestion(q.id, { is_true: false })}
                  >
                    <X className="h-3.5 w-3.5" />
                    خطأ
                  </Button>
                </div>
              </div>
            )}

            {q.type === "conceptual" && (
              <div className="grid gap-1.5">
                <Label>الإجابة النموذجية</Label>
                <Textarea
                  value={q.answer ?? ""}
                  onChange={(e) =>
                    updateQuestion(q.id, { answer: e.target.value })
                  }
                  rows={2}
                  placeholder="اكتب الإجابة النموذجية..."
                />
              </div>
            )}

            <div className="grid gap-1.5">
              <Label>الشرح</Label>
              <Textarea
                value={q.explanation}
                onChange={(e) =>
                  updateQuestion(q.id, { explanation: e.target.value })
                }
                rows={2}
                placeholder="شرح الإجابة..."
              />
            </div>

            {(q.type === "mcq" || q.type === "numerical") && (
              <div className="grid gap-1.5">
                <Label>الصيغة المستخدمة (اختياري)</Label>
                <Input
                  value={q.formula_used ?? ""}
                  onChange={(e) =>
                    updateQuestion(q.id, { formula_used: e.target.value })
                  }
                  placeholder="I = V/R"
                  dir="ltr"
                  className="font-mono"
                />
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
