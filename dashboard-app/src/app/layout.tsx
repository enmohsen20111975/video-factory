import type { Metadata } from "next";
import { Cairo, Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "مصنع الفيديو الموحد | Unified Video Factory",
  description:
    "نظام إدارة دورة حياة المحتوى التعليمي من رفع الكتاب حتى توليد الفيديو",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${cairo.variable} ${inter.variable}`}
    >
      <body
        className="font-sans antialiased"
        style={{ fontFamily: "var(--font-cairo), var(--font-inter), sans-serif" }}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
          <div className="flex min-h-screen w-full bg-background">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              {children}
            </div>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
