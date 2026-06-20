"use client";

import * as React from "react";
import { Plus, Trash2, Table as TableIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LessonTable } from "@/lib/types";

interface TableEditorProps {
  tables: LessonTable[];
  onChange: (tables: LessonTable[]) => void;
}

function genId() {
  return `tbl-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function TableEditor({ tables, onChange }: TableEditorProps) {
  const addTable = () => {
    const newTable: LessonTable = {
      id: genId(),
      title: "جدول جديد",
      headers: ["العمود 1", "العمود 2"],
      rows: [["", ""]],
    };
    onChange([...tables, newTable]);
  };

  const removeTable = (id: string) => {
    onChange(tables.filter((t) => t.id !== id));
  };

  const updateTable = (id: string, patch: Partial<LessonTable>) => {
    onChange(tables.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const addRow = (id: string) => {
    const table = tables.find((t) => t.id === id);
    if (!table) return;
    const newRow = table.headers.map(() => "");
    updateTable(id, { rows: [...table.rows, newRow] });
  };

  const removeRow = (id: string, rowIdx: number) => {
    const table = tables.find((t) => t.id === id);
    if (!table) return;
    updateTable(id, { rows: table.rows.filter((_, i) => i !== rowIdx) });
  };

  const addColumn = (id: string) => {
    const table = tables.find((t) => t.id === id);
    if (!table) return;
    updateTable(id, {
      headers: [...table.headers, `العمود ${table.headers.length + 1}`],
      rows: table.rows.map((r) => [...r, ""]),
    });
  };

  const removeColumn = (id: string, colIdx: number) => {
    const table = tables.find((t) => t.id === id);
    if (!table) return;
    if (table.headers.length <= 1) return;
    updateTable(id, {
      headers: table.headers.filter((_, i) => i !== colIdx),
      rows: table.rows.map((r) => r.filter((_, i) => i !== colIdx)),
    });
  };

  const updateHeader = (id: string, colIdx: number, value: string) => {
    const table = tables.find((t) => t.id === id);
    if (!table) return;
    const headers = [...table.headers];
    headers[colIdx] = value;
    updateTable(id, { headers });
  };

  const updateCell = (
    id: string,
    rowIdx: number,
    colIdx: number,
    value: string,
  ) => {
    const table = tables.find((t) => t.id === id);
    if (!table) return;
    const rows = table.rows.map((r) => [...r]);
    rows[rowIdx][colIdx] = value;
    updateTable(id, { rows });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {tables.length} جدول في هذا الدرس
        </p>
        <Button size="sm" onClick={addTable}>
          <Plus className="h-3.5 w-3.5" />
          إضافة جدول
        </Button>
      </div>

      {tables.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-slate-700 p-12 text-center">
          <TableIcon className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">لا توجد جداول</p>
          <p className="text-xs text-muted-foreground mt-1">
            اضغط «إضافة جدول» لإنشاء جدول جديد
          </p>
        </div>
      ) : (
        tables.map((table) => (
          <Card key={table.id} className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Input
                value={table.title}
                onChange={(e) =>
                  updateTable(table.id, { title: e.target.value })
                }
                placeholder="عنوان الجدول"
                className="font-semibold"
              />
              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-rose-400 shrink-0"
                onClick={() => removeTable(table.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="overflow-auto rounded-md border border-slate-800">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-900/40">
                    {table.headers.map((h, ci) => (
                      <TableHead key={ci} className="p-1">
                        <div className="flex items-center gap-1">
                          <Input
                            value={h}
                            onChange={(e) =>
                              updateHeader(table.id, ci, e.target.value)
                            }
                            className="h-7 text-xs font-semibold bg-transparent border-0"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-rose-400"
                            onClick={() => removeColumn(table.id, ci)}
                          >
                            ×
                          </Button>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {table.rows.map((row, ri) => (
                    <TableRow key={ri}>
                      {row.map((cell, ci) => (
                        <TableCell key={ci} className="p-1">
                          <Input
                            value={cell}
                            onChange={(e) =>
                              updateCell(table.id, ri, ci, e.target.value)
                            }
                            className="h-7 text-xs bg-transparent border-0"
                          />
                        </TableCell>
                      ))}
                      <TableCell className="p-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-muted-foreground hover:text-rose-400"
                          onClick={() => removeRow(table.id, ri)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => addRow(table.id)}>
                <Plus className="h-3.5 w-3.5" />
                صف
              </Button>
              <Button size="sm" variant="outline" onClick={() => addColumn(table.id)}>
                <Plus className="h-3.5 w-3.5" />
                عمود
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
