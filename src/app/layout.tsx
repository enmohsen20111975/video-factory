import "./globals.css";

export const metadata = {
  title: "🎬 Video Factory",
  description: "منتج فيديوهات تعليمية بالذكاء الاصطناعي"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-cairo bg-slate-950 text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}