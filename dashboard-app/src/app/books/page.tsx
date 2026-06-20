"use client";

import * as React from "react";
import { Plus, BookOpen, Loader2, Search } from "lucide-react";
import { Header } from "@/components/Header";
import { BookCard } from "@/components/BookCard";
import { UploadBookModal } from "@/components/UploadBookModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { EmptyState, PageLoader } from "@/components/ui/spinner";
import { booksApi } from "@/lib/api";
import { useFetch } from "@/hooks/use-fetch";
import { useAsyncAction } from "@/hooks/use-async-action";
import { SUBJECT_LABELS } from "@/lib/utils";
import type { BookListItem, Subject } from "@/lib/types";

const SUBJECTS = Object.entries(SUBJECT_LABELS).filter(([k]) => k !== "other");

export default function BooksPage() {
  const [showUpload, setShowUpload] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [subjectFilter, setSubjectFilter] = React.useState<string>("all");

  const { data: books, loading, refetch } = useFetch<BookListItem[]>(
    () => booksApi.list(),
    [],
  );
  const { run: rerun } = useAsyncAction();

  const filtered = React.useMemo(() => {
    if (!books) return [];
    return books.filter((b) => {
      if (subjectFilter !== "all" && b.subject !== subjectFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          b.title.toLowerCase().includes(q) ||
          b.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [books, search, subjectFilter]);

  return (
    <>
      <Header
        title="مكتبة الكتب"
        description={`${books?.length ?? 0} كتاب في النظام`}
        actions={
          <Button size="sm" onClick={() => setShowUpload(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">رفع كتاب</span>
          </Button>
        }
      />
      <main className="flex-1 p-4 md:p-6 space-y-4">
        {/* Filters */}
        <Card className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن كتاب..."
                className="pr-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">
                المادة:
              </Label>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المواد</SelectItem>
                  {SUBJECTS.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Grid */}
        {loading ? (
          <PageLoader label="جاري تحميل الكتب..." />
        ) : filtered.length === 0 ? (
          <Card className="p-8">
            <EmptyState
              icon={<BookOpen className="h-12 w-12" />}
              title={search || subjectFilter !== "all" ? "لا توجد نتائج" : "لا توجد كتب بعد"}
              description={
                search || subjectFilter !== "all"
                  ? "جرّب تغيير معايير البحث"
                  : "ابدأ برفع أول كتاب PDF"
              }
              action={
                !search && subjectFilter === "all" ? (
                  <Button onClick={() => setShowUpload(true)}>
                    <Plus className="h-4 w-4" />
                    رفع كتاب
                  </Button>
                ) : undefined
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((book) => (
              <BookCard key={book.id} book={book} onChanged={refetch} />
            ))}
          </div>
        )}
      </main>

      <UploadBookModal
        open={showUpload}
        onOpenChange={setShowUpload}
        onUploaded={refetch}
      />
    </>
  );
}
