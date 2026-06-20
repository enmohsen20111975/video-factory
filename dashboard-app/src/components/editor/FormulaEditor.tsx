"use client";

import * as React from "react";
import { Plus, Trash2, Sigma } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { KatexRenderer } from "@/components/ui/katex";
import type { Formula, FormulaVariable } from "@/lib/types";

interface FormulaEditorProps {
  formulas: Formula[];
  onChange: (formulas: Formula[]) => void;
}

function genId() {
  return `form-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function FormulaEditor({ formulas, onChange }: FormulaEditorProps) {
  const addFormula = () => {
    const newF: Formula = {
      id: genId(),
      latex: "x = \\frac{a}{b}",
      description: "",
      variables: [],
    };
    onChange([...formulas, newF]);
  };

  const updateFormula = (id: string, patch: Partial<Formula>) => {
    onChange(formulas.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeFormula = (id: string) => {
    onChange(formulas.filter((f) => f.id !== id));
  };

  const addVariable = (id: string) => {
    const f = formulas.find((x) => x.id === id);
    if (!f) return;
    const newVar: FormulaVariable = { symbol: "", meaning: "", unit: "" };
    updateFormula(id, { variables: [...f.variables, newVar] });
  };

  const updateVariable = (
    id: string,
    idx: number,
    patch: Partial<FormulaVariable>,
  ) => {
    const f = formulas.find((x) => x.id === id);
    if (!f) return;
    const variables = f.variables.map((v, i) =>
      i === idx ? { ...v, ...patch } : v,
    );
    updateFormula(id, { variables });
  };

  const removeVariable = (id: string, idx: number) => {
    const f = formulas.find((x) => x.id === id);
    if (!f) return;
    updateFormula(id, {
      variables: f.variables.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {formulas.length} صيغة رياضية
        </p>
        <Button size="sm" onClick={addFormula}>
          <Plus className="h-3.5 w-3.5" />
          إضافة صيغة
        </Button>
      </div>

      {formulas.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-slate-700 p-12 text-center">
          <Sigma className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">لا توجد صيغ رياضية</p>
        </div>
      ) : (
        formulas.map((f) => (
          <Card key={f.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="grid gap-1.5 flex-1">
                <Label htmlFor={`latex-${f.id}`}>صيغة LaTeX</Label>
                <Input
                  id={`latex-${f.id}`}
                  value={f.latex}
                  onChange={(e) =>
                    updateFormula(f.id, { latex: e.target.value })
                  }
                  dir="ltr"
                  placeholder="V = I \\times R"
                  className="font-mono"
                />
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-rose-400 mt-6"
                onClick={() => removeFormula(f.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Preview */}
            <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3 min-h-[60px] flex items-center justify-center">
              <KatexRenderer latex={f.latex} display />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={`desc-${f.id}`}>الوصف</Label>
              <Input
                id={`desc-${f.id}`}
                value={f.description}
                onChange={(e) =>
                  updateFormula(f.id, { description: e.target.value })
                }
                placeholder="وصف مختصر للصيغة..."
              />
            </div>

            {/* Variables */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>المتغيرات</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addVariable(f.id)}
                >
                  <Plus className="h-3 w-3" />
                  متغير
                </Button>
              </div>
              {f.variables.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  لا توجد متغيرات
                </p>
              ) : (
                <div className="space-y-2">
                  {f.variables.map((v, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center"
                    >
                      <Input
                        value={v.symbol}
                        onChange={(e) =>
                          updateVariable(f.id, idx, { symbol: e.target.value })
                        }
                        placeholder="V"
                        className="col-span-2 font-mono text-center"
                        dir="ltr"
                      />
                      <Input
                        value={v.meaning}
                        onChange={(e) =>
                          updateVariable(f.id, idx, { meaning: e.target.value })
                        }
                        placeholder="المعنى"
                        className="col-span-6"
                      />
                      <Input
                        value={v.unit}
                        onChange={(e) =>
                          updateVariable(f.id, idx, { unit: e.target.value })
                        }
                        placeholder="الوحدة"
                        className="col-span-3"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="col-span-1 h-8 w-8 text-muted-foreground hover:text-rose-400"
                        onClick={() => removeVariable(f.id, idx)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
