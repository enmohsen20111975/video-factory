"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-amber-400 mb-3" />
        <h1 className="text-2xl font-bold mb-1">404</h1>
        <p className="text-sm text-muted-foreground mb-4">
          الصفحة التي تبحث عنها غير موجودة
        </p>
        <Button asChild>
          <Link href="/">
            <ArrowRight className="h-4 w-4" />
            العودة للوحة التحكم
          </Link>
        </Button>
      </div>
    </div>
  );
}
