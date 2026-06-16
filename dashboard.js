const express = require("express");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const app = express();
const PORT = 3002;

app.use(express.static("public"));
app.use(express.json());

const configPath = path.join(__dirname, "content-extractor/config/pipeline-config.json");

function loadConfig() {
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } catch (e) {
      console.warn("⚠️ Warning: Failed to parse pipeline-config.json:", e.message);
    }
  }
  return {};
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("❌ Error: Failed to save pipeline-config.json:", e.message);
    return false;
  }
}

app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🎬 لوحة تحكم مصنع الفيديو الذكي</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@3.4.1/dist/tailwind.min.css" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
    body { font-family: 'Cairo', sans-serif; background: linear-gradient(135deg, #0B0F19 0%, #1E293B 100%); min-height: 100vh; color: #F8FAFC; }
    .glass { background: rgba(30, 41, 59, 0.45); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08); }
    .btn { transition: all 0.3s ease; transform: translateY(0); }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3); }
    input, select, textarea { background: rgba(15, 23, 42, 0.6) !important; border: 1px solid rgba(255, 255, 255, 0.15) !important; transition: all 0.2s ease; }
    input:focus, select:focus, textarea:focus { border-color: #818CF8 !important; outline: none !important; box-shadow: 0 0 10px rgba(129, 140, 248, 0.2); }
  </style>
</head>
<body class="p-6">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="text-center mb-8 pb-6 border-b border-gray-700/60">
      <h1 class="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
        🎬 لوحة التحكم والمصنع الذكي
      </h1>
      <p class="text-gray-400">نظام إنتاج الفيديوهات التعليمية مع تحكم كامل بالخيارات والأداء</p>
    </div>
    
    <div class="grid lg:grid-cols-3 gap-6">
      <!-- Left Column: Controls (Width 2/3) -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Text Editor -->
        <div class="glass p-6 rounded-2xl">
          <h2 class="text-xl font-bold mb-4 text-purple-400 flex items-center gap-2">
            <span class="text-2xl">📝</span> محرّر سكريبت الشرح
          </h2>
          <textarea id="scriptText" rows="6" class="w-full p-4 rounded-xl text-gray-100 resize-none" placeholder="اكتب النص الشرح هنا..." spellcheck="false"></textarea>
          
          <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block mb-2 text-sm font-medium text-gray-300">🔊 صوت المعلق الافتراضي:</label>
              <select id="voiceSelect" class="w-full p-3 rounded-xl text-gray-100">
                <option value="ar-EG-SalmaNeural">🗣️ سلمى - مصر (محادثة ودودة)</option>
                <option value="ar-EG-ShakirNeural">🗣️ شاكر - مصر (رسمي واضح)</option>
                <option value="ar-SA-ZariyahNeural">🗣️ زارية - السعودية (واضح)</option>
                <option value="ar-AE-FatimaNeural">🗣️ فاطمة - الإمارات (مهني)</option>
              </select>
            </div>
            <div>
              <label class="block mb-2 text-sm font-medium text-gray-300">⏱️ سرعة ونبرة الصوت:</label>
              <div class="grid grid-cols-2 gap-2">
                <input type="text" id="voiceRate" placeholder="السرعة (مثل +5%)" class="p-3 rounded-xl text-gray-100 text-center">
                <input type="text" id="voicePitch" placeholder="النبرة (مثل +0Hz)" class="p-3 rounded-xl text-gray-100 text-center">
              </div>
            </div>
          </div>
          
          <button onclick="generateAudio()" class="btn w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl font-bold">
            🎙️ توليد الصوت وتوقيت الكلمات تلقائيًا
          </button>
        </div>
        
        <!-- Pipeline Configuration Panel -->
        <div class="glass p-6 rounded-2xl">
          <h2 class="text-xl font-bold mb-4 text-pink-400 flex items-center gap-2">
            <span class="text-2xl">⚙️</span> إعدادات خط الإنتاج (Central Config)
          </h2>
          
          <div class="grid md:grid-cols-2 gap-6">
            <!-- Stage 1 & 2 -->
            <div class="space-y-4">
              <h3 class="text-md font-semibold text-indigo-300 border-b border-gray-700/50 pb-2">🖼️ تحويل PDF وصور الـ VLM</h3>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs text-gray-400">دقة التحويل (DPI)</label>
                  <input type="number" id="cfgDpi" class="w-full p-2 rounded-lg text-center font-bold text-gray-200">
                </div>
                <div>
                  <label class="text-xs text-gray-400">أقصى أبعاد (Max Size)</label>
                  <input type="number" id="cfgMaxSize" class="w-full p-2 rounded-lg text-center font-bold text-gray-200">
                </div>
                <div>
                  <label class="text-xs text-gray-400">نموذج الـ VLM</label>
                  <select id="cfgModel" class="w-full p-2 rounded-lg text-gray-200 text-xs">
                    <option value="qwen2-vl:7b">qwen2-vl:7b (الأفضل)</option>
                    <option value="gemma3:4b">gemma3:4b (سريع)</option>
                    <option value="qwen2-vl:2b">qwen2-vl:2b (خفيف)</option>
                  </select>
                </div>
                <div>
                  <label class="text-xs text-gray-400">تبريد الـ GPU (ثانية)</label>
                  <input type="number" id="cfgCooldown" class="w-full p-2 rounded-lg text-center font-bold text-gray-200">
                </div>
              </div>
            </div>
            
            <!-- Stage 4 & 5 -->
            <div class="space-y-4">
              <h3 class="text-md font-semibold text-indigo-300 border-b border-gray-700/50 pb-2">🎬 المعالجة وتصدير الفيديو</h3>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs text-gray-400">عدد الأسئلة بالبنك</label>
                  <input type="number" id="cfgQuestions" class="w-full p-2 rounded-lg text-center font-bold text-gray-200">
                </div>
                <div>
                  <label class="text-xs text-gray-400">أنوية الرندرة (Cores)</label>
                  <input type="number" id="cfgConcurrency" class="w-full p-2 rounded-lg text-center font-bold text-gray-200">
                </div>
                <div>
                  <label class="text-xs text-gray-400">جودة ضغط الفيديو (CRF)</label>
                  <input type="number" id="cfgCrf" class="w-full p-2 rounded-lg text-center font-bold text-gray-200">
                </div>
                <div>
                  <label class="text-xs text-gray-400">لهجة الشرح</label>
                  <select id="cfgDialect" class="w-full p-2 rounded-lg text-gray-200 text-xs">
                    <option value="egyptian_colloquial">عامية مصرية</option>
                    <option value="standard_arabic">عربية فصحى</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <button onclick="savePipelineConfig()" class="btn w-full mt-6 bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 rounded-xl font-bold">
            💾 حفظ الإعدادات المركزية وتطبيقها
          </button>
        </div>
      </div>
      
      <!-- Right Column: Actions + Status (Width 1/3) -->
      <div class="space-y-6">
        <!-- Actions Panel -->
        <div class="glass p-6 rounded-2xl">
          <h2 class="text-xl font-bold mb-4 text-indigo-400 flex items-center gap-2">
            <span class="text-2xl">🚀</span> الإجراءات المتاحة
          </h2>
          <div class="space-y-3">
            <div class="bg-slate-800/40 p-3 rounded-xl border border-gray-700/50">
              <label class="block text-xs text-gray-400 mb-1">الدرس النشط حالياً:</label>
              <input type="text" id="lessonId" value="ohm-law" class="w-full p-2 rounded-lg text-center font-bold text-indigo-300">
            </div>
            
            <button onclick="loadCurrentText()" class="btn w-full bg-gray-700/60 text-gray-200 py-3 rounded-xl text-sm font-semibold">
              📥 تحميل النص الحالي من ملف الدرس
            </button>
            <button onclick="renderPreview()" class="btn w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-bold">
              👁️ معاينة حية (Remotion Studio)
            </button>
            <button onclick="renderFinal()" class="btn w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-3 rounded-xl font-bold">
              🚀 تصدير الفيديو النهائي (MP4)
            </button>
            <button onclick="downloadVideo()" class="btn w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-bold">
              📥 تحميل / مشاهدة الفيديو النهائي
            </button>
          </div>
        </div>
        
        <!-- Status Box -->
        <div class="glass p-6 rounded-2xl min-h-[160px] flex flex-col items-center justify-center text-center">
          <h3 class="text-sm text-gray-400 font-medium mb-2">📡 حالة العملية الحالية</h3>
          <div id="statusBox" class="text-gray-300">
            ستظهر التحديثات هنا بمجرد اتخاذ أي إجراء...
          </div>
        </div>
        
        <div class="glass p-4 rounded-xl text-center text-xs text-gray-500">
          لوحة التحكم متصلة بـ Remotion Studio على المنفذ <span class="text-purple-400">3001</span>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    let currentConfig = {};

    async function loadCurrentText() {
      const lesson = document.getElementById('lessonId').value;
      const status = document.getElementById('statusBox');
      status.innerHTML = '<p class="text-blue-300">⏳ جاري تحميل النص...</p>';
      try {
        const res = await fetch(\`/api/get-text?lesson=\${lesson}\`);
        const data = await res.json();
        document.getElementById('scriptText').value = data.voiceoverText || '';
        status.innerHTML = '<p class="text-green-400">✅ تم تحميل النص! يمكنك التعديل وحفظ الصوت.</p>';
      } catch(e) { status.innerHTML = '<p class="text-red-400">❌ فشل تحميل النص</p>'; }
    }
    
    async function generateAudio() {
      const text = document.getElementById('scriptText').value;
      const voice = document.getElementById('voiceSelect').value;
      const lesson = document.getElementById('lessonId').value;
      const status = document.getElementById('statusBox');
      
      if (!text) return alert('يرجى كتابة نص الشرح أولاً!');
      
      status.innerHTML = '<p class="text-amber-300">⏳ جاري توليد الصوت والتوقيت بدقة عالية...</p>';
      try {
        const res = await fetch('/api/generate-tts', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({text, voice, lesson})
        });
        const data = await res.json();
        if (data.success) {
          status.innerHTML = '<p class="text-green-400">✅ تم توليد ملفات الصوت والتوقيت بنجاح!</p>';
        } else {
          status.innerHTML = '<p class="text-red-400">❌ خطأ: ' + (data.error || 'فشلت العملية') + '</p>';
        }
      } catch(e) { status.innerHTML = '<p class="text-red-400">❌ فشل التوليد</p>'; }
    }
    
    async function renderPreview() {
      window.open('http://localhost:3001', '_blank');
    }
    
    async function renderFinal() {
      const lesson = document.getElementById('lessonId').value;
      const status = document.getElementById('statusBox');
      status.innerHTML = '<p class="text-amber-300">⏳ جاري تصدير ورندرة الفيديو (هذه العملية تستغرق دقائق)...</p>';
      try {
        const res = await fetch('/api/render', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({lesson})
        });
        const data = await res.json();
        if (data.success) {
          status.innerHTML = '<p class="text-green-400">✅ تم إنتاج وضغط الفيديو النهائي! ابحث عنه في مجلد public/</p>';
        } else {
          status.innerHTML = '<p class="text-red-400">❌ فشل التصدير: ' + (data.error || 'غير معروف') + '</p>';
        }
      } catch(e) { status.innerHTML = '<p class="text-red-400">❌ فشل تصدير الفيديو</p>'; }
    }
    
    async function downloadVideo() {
      const lesson = document.getElementById('lessonId').value;
      window.open(\`/\${lesson}.mp4\`, '_blank');
    }

    // Central Config API functions
    async function fetchPipelineConfig() {
      try {
        const res = await fetch('/api/config');
        currentConfig = await res.json();
        
        // Populate inputs
        document.getElementById('cfgDpi').value = currentConfig.stage_1_pdf_to_image?.dpi || 150;
        document.getElementById('cfgMaxSize').value = currentConfig.stage_1_pdf_to_image?.max_size || 512;
        document.getElementById('cfgModel').value = currentConfig.stage_2_vlm_extraction?.preferred_model || 'qwen2-vl:7b';
        document.getElementById('cfgCooldown').value = currentConfig.stage_2_vlm_extraction?.cooldown_seconds || 10;
        document.getElementById('cfgQuestions').value = currentConfig.stage_4_generator?.mcq_questions_count || 5;
        document.getElementById('cfgConcurrency').value = currentConfig.stage_5_video_factory?.remotion?.concurrency || 4;
        document.getElementById('cfgCrf').value = currentConfig.stage_5_video_factory?.ffmpeg?.crf || 22;
        document.getElementById('cfgDialect').value = currentConfig.stage_4_generator?.voiceover_dialect || 'egyptian_colloquial';
        
        document.getElementById('voiceSelect').value = currentConfig.stage_5_video_factory?.tts?.voice || 'ar-EG-SalmaNeural';
        document.getElementById('voiceRate').value = currentConfig.stage_5_video_factory?.tts?.rate || '+5%';
        document.getElementById('voicePitch').value = currentConfig.stage_5_video_factory?.tts?.pitch || '+0Hz';
      } catch (e) {
        console.error("Failed to load config:", e);
      }
    }

    async function savePipelineConfig() {
      const status = document.getElementById('statusBox');
      status.innerHTML = '<p class="text-blue-300">⏳ جاري حفظ الإعدادات...</p>';
      
      // Build updated config object
      const updated = {
        ...currentConfig,
        stage_1_pdf_to_image: {
          ...currentConfig.stage_1_pdf_to_image,
          dpi: parseInt(document.getElementById('cfgDpi').value),
          max_size: parseInt(document.getElementById('cfgMaxSize').value)
        },
        stage_2_vlm_extraction: {
          ...currentConfig.stage_2_vlm_extraction,
          preferred_model: document.getElementById('cfgModel').value,
          cooldown_seconds: parseInt(document.getElementById('cfgCooldown').value)
        },
        stage_4_generator: {
          ...currentConfig.stage_4_generator,
          mcq_questions_count: parseInt(document.getElementById('cfgQuestions').value),
          voiceover_dialect: document.getElementById('cfgDialect').value
        },
        stage_5_video_factory: {
          ...currentConfig.stage_5_video_factory,
          tts: {
            ...currentConfig.stage_5_video_factory?.tts,
            voice: document.getElementById('voiceSelect').value,
            rate: document.getElementById('voiceRate').value,
            pitch: document.getElementById('voicePitch').value
          },
          remotion: {
            ...currentConfig.stage_5_video_factory?.remotion,
            concurrency: parseInt(document.getElementById('cfgConcurrency').value)
          },
          ffmpeg: {
            ...currentConfig.stage_5_video_factory?.ffmpeg,
            crf: parseInt(document.getElementById('cfgCrf').value)
          }
        }
      };

      try {
        const res = await fetch('/api/config', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(updated)
        });
        const data = await res.json();
        if (data.success) {
          currentConfig = updated;
          status.innerHTML = '<p class="text-green-400">✅ تم حفظ الإعدادات المركزية وتطبيقها بنجاح!</p>';
        } else {
          status.innerHTML = '<p class="text-red-400">❌ فشل حفظ الإعدادات</p>';
        }
      } catch (e) {
        status.innerHTML = '<p class="text-red-400">❌ حدث خطأ أثناء الحفظ</p>';
      }
    }
    
    // Load config on page load
    window.onload = async () => {
      await fetchPipelineConfig();
      await loadCurrentText();
    };
  </script>
</body>
</html>
  `);
});

// API: Get current text for a lesson
app.get("/api/get-text", (req, res) => {
  const lesson = req.query.lesson || "ohm-law";
  try {
    const dataPath = path.join(__dirname, `src/data/${lesson}.json`);
    if (fs.existsSync(dataPath)) {
      const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
      res.json({ voiceoverText: data.voiceoverText || data.introText || "" });
    } else {
      res.json({ voiceoverText: "" });
    }
  } catch(e) {
    res.json({ voiceoverText: "" });
  }
});

// API: Get config
app.get("/api/config", (req, res) => {
  res.json(loadConfig());
});

// API: Save config
app.post("/api/config", (req, res) => {
  if (saveConfig(req.body)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: "Failed to save configuration" });
  }
});

// API: Generate TTS
app.post("/api/generate-tts", (req, res) => {
  const { text, voice, lesson } = req.body;
  const config = loadConfig();
  const ttsConfig = (config.stage_5_video_factory && config.stage_5_video_factory.tts) || {};
  const rate = ttsConfig.rate || "+5%";
  const pitch = ttsConfig.pitch || "+0Hz";

  const pyScript = path.join(__dirname, "scripts/generate_tts.py");
  const audioPath = path.join(__dirname, `public/voiceovers/${lesson}.mp3`);
  const tsPath = path.join(__dirname, `public/timestamps/${lesson}.json`);
  
  fs.mkdirSync(path.dirname(audioPath), { recursive: true });
  fs.mkdirSync(path.dirname(tsPath), { recursive: true });
  
  try {
    execSync(`python "${pyScript}" --text "${text}" --voice "${voice}" --rate "${rate}" --pitch "${pitch}" --output-audio "${audioPath}" --output-timestamps "${tsPath}"`, 
      { stdio: "pipe" });
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Render video
app.post("/api/render", (req, res) => {
  const { lesson } = req.body;
  const activeLesson = lesson || "ohm-law";
  try {
    execSync(`node run-factory.js --lesson=${activeLesson}`, { stdio: "pipe" });
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`🎛️ Dashboard ready at http://localhost:${PORT}`);
});