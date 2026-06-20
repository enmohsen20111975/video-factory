"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md w-full rounded-lg border border-rose-500/30 bg-rose-500/5 p-6 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-400 mb-3" />
        <h2 className="text-lg font-bold mb-1">حدث خطأ ما</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {error.message || "حدث خطأ غير متوقع. حاول مرة أخرى."}
        </p>
        <div className="flex items-center justify-center gap-2">
          <Button onClick={reset} size="sm">
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/">الصفحة الرئيسية</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
