"use client";

import dynamic from "next/dynamic";

const RemotionPlayer = dynamic(() => import("./components/RemotionPlayer"), {
  ssr: false,
});

const DashboardClient = dynamic(() => import("./components/DashboardClient"), {
  ssr: false,
});

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <div className="container mx-auto px-4 py-6">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            🎬 لوحة التحكم الذكية
          </h1>
          <p className="text-gray-400">انتاج فيديوهات تعليمية بجودة احترافية</p>
        </header>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <DashboardClient />
          </div>

          <div className="lg:col-span-2">
            <div className="glass p-4 rounded-2xl">
              <h2 className="text-xl font-bold mb-4 text-purple-400 flex items-center gap-2">
                <span>🎥</span> معاينة الفيديو الحية
              </h2>
              <RemotionPlayer />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}