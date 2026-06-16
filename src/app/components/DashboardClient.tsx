"use client";

import React, { useState, useEffect } from "react";

export default function DashboardClient() {
  const [scriptText, setScriptText] = useState("");
  const [voice, setVoice] = useState("ar-EG-SalmaNeural");
  const [status, setStatus] = useState("مستعد");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadCurrentText();
  }, []);

  const loadCurrentText = async () => {
    setStatus("جاري التحميل...");
    try {
      const res = await fetch("/api/get-text");
      const data = await res.json();
      setScriptText(data.voiceoverText || "");
      setStatus("تم التحميل ✅");
    } catch {
      setStatus("فشل التحميل");
    }
  };

  const generateAudio = async () => {
    if (!scriptText) return alert("اكتب النص أولاً!");
    
    setIsGenerating(true);
    setStatus("جاري توليد الصوت...");
    
    try {
      await fetch("/api/generate-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: scriptText, voice, lesson: "ohm-law" })
      });
      setStatus("تم التوليد! حدث المعاينة 🔄");
      setTimeout(() => window.location.reload(), 2000);
    } catch {
      setStatus("فشل التوليد ❌");
    } finally {
      setIsGenerating(false);
    }
  };

  const renderVideo = async () => {
    setStatus("جاري التصدير (قد يأخذ دقائق)...");
    try {
      await fetch("/api/render", { method: "POST" });
      setStatus("تم التصدير! تفقد public/");
    } catch {
      setStatus("فشل التصدير ❌");
    }
  };

  return (
    <div className="space-y-6">
      {/* Text Editor */}
      <div className="glass p-5 rounded-2xl">
        <h2 className="text-lg font-bold mb-3 text-purple-400 flex items-center gap-2">
          📝 محرّر النص العربي
        </h2>
        <textarea
          value={scriptText}
          onChange={(e) => setScriptText(e.target.value)}
          rows={6}
          className="w-full p-3 rounded-xl bg-gray-800/50 border border-gray-600 focus:border-purple-500 text-gray-100 resize-none"
          placeholder="اكتب النص هنا..."
        />
        
        <div className="mt-3">
          <label className="block mb-2 text-sm font-medium text-gray-300">🔊 الصوت:</label>
          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            className="w-full p-2 rounded-xl bg-gray-800/50 border border-gray-600 text-gray-100"
          >
            <option value="ar-EG-SalmaNeural">🗣️ سلمى - مصر</option>
            <option value="ar-EG-ShakirNeural">🗣️ شاكر - مصر</option>
            <option value="ar-SA-NorahNeural">🗣️ نورة - سعودية</option>
            <option value="ar-AE-FatimaNeural">🗣️ فاطمة - إمارات</option>
          </select>
        </div>
        
        <button
          onClick={generateAudio}
          disabled={isGenerating}
          className="mt-3 w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-2 rounded-xl font-bold disabled:opacity-50 transition-all hover:scale-105"
        >
          🎙️ توليد الصوت والتوقيت
        </button>
      </div>

      {/* Timeline Editor */}
      <div className="glass p-5 rounded-2xl">
        <h2 className="text-lg font-bold mb-3 text-blue-400">⏱️ الفترات الزمنية</h2>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><label>المقدمة</label><input type="number" defaultValue={4} className="w-full p-1 rounded bg-gray-800/50 text-center" /></div>
          <div><label>العنوان</label><input type="number" defaultValue={8} className="w-full p-1 rounded bg-gray-800/50 text-center" /></div>
          <div><label>الصيغة</label><input type="number" defaultValue={12} className="w-full p-1 rounded bg-gray-800/50 text-center" /></div>
          <div><label>المحاكي</label><input type="number" defaultValue={16} className="w-full p-1 rounded bg-gray-800/50 text-center" /></div>
          <div><label>الخريطة</label><input type="number" defaultValue={15} className="w-full p-1 rounded bg-gray-800/50 text-center" /></div>
          <div><label>الاختبار</label><input type="number" defaultValue={15} className="w-full p-1 rounded bg-gray-800/50 text-center" /></div>
        </div>
      </div>

      {/* Export */}
      <button
        onClick={renderVideo}
        className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-3 rounded-xl font-bold transition-all hover:scale-105"
      >
        🚀 تصدير الفيديو النهائي
      </button>

      {/* Status */}
      <div className="glass p-3 rounded-xl text-center text-sm text-gray-300">
        الحالة: {status}
      </div>
    </div>
  );
}