const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Parse arguments
const args = process.argv.slice(2);
let lessonName = "ohm-law";

args.forEach(arg => {
  if (arg.startsWith("--lesson=")) {
    lessonName = arg.split("=")[1];
  } else if (!arg.startsWith("-")) {
    lessonName = arg;
  }
});

console.log(`🚀 Starting execution of local video factory for lesson: ${lessonName}...`);

// Load centralized config
const configPath = path.join(__dirname, "content-extractor/config/pipeline-config.json");
let config = {};
if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (e) {
    console.warn("⚠️ Warning: Failed to parse pipeline-config.json, using defaults.");
  }
}
const factoryConfig = config.stage_5_video_factory || {};
const ttsConfig = factoryConfig.tts || {};
const remotionConfig = factoryConfig.remotion || {};
const ffmpegConfig = factoryConfig.ffmpeg || {};

const dataPath = path.join(__dirname, `src/data/${lessonName}.json`);
const rawVideoPath = path.join(__dirname, `public/${lessonName}-raw.mp4`);
const finalVideoPath = path.join(__dirname, `public/${lessonName}.mp4`);

// 1. Check if lesson data exists
if (!fs.existsSync(dataPath)) {
  console.error(`❌ Error: Data file not found at ${dataPath}`);
  process.exit(1);
}

// Ensure public directory exists
const publicDir = path.join(__dirname, "public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Load lesson data
const lessonData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

// 2. Generate voiceover and timestamps if python script and edge-tts are available
const scriptText = lessonData.introText || lessonData.voiceoverText;
if (scriptText) {
  console.log("🎙️ Step 1: Generating voiceover and timestamps using Edge-TTS...");
  const pythonScriptPath = path.join(__dirname, "scripts/generate_tts.py");
  const audioOutPath = path.join(__dirname, `public/voiceovers/${lessonName}.mp3`);
  const timestampsOutPath = path.join(__dirname, `public/timestamps/${lessonName}.json`);
  
  // Ensure directories exist
  fs.mkdirSync(path.join(__dirname, "public/voiceovers"), { recursive: true });
  fs.mkdirSync(path.join(__dirname, "public/timestamps"), { recursive: true });
  
  try {
    const voice = ttsConfig.voice || "ar-EG-SalmaNeural";
    const rate = ttsConfig.rate || "+5%";
    const pitch = ttsConfig.pitch || "+0Hz";
    // Run python script to generate speech and word timestamps
    execSync(`python "${pythonScriptPath}" --text "${scriptText}" --voice "${voice}" --rate "${rate}" --pitch "${pitch}" --output-audio "${audioOutPath}" --output-timestamps "${timestampsOutPath}"`, { stdio: "inherit" });
    console.log("✅ TTS and Timestamp generation completed successfully.");
  } catch (err) {
    console.warn("⚠️ Warning: Python TTS generation failed. If 'edge-tts' is not installed, install it with 'pip install edge-tts'. Proceeding with render using fallback timing.");
  }
}

// 3. Render raw video using Remotion
console.log("🎬 Step 2: Rendering video frames using Remotion CLI...");
try {
  // Overwrite existing raw video if it exists
  if (fs.existsSync(rawVideoPath)) {
    fs.unlinkSync(rawVideoPath);
  }

  // Execute Remotion render
  const concurrency = remotionConfig.concurrency || 4;
  execSync(`npx remotion render LessonVideo "${rawVideoPath}" --props="${dataPath}" --concurrency=${concurrency}`, { stdio: "inherit" });
  console.log("✅ Remotion render completed successfully.");
} catch (err) {
  console.error("❌ Error: Remotion render failed.", err.message);
  process.exit(1);
}

// 4. Compress raw video using FFmpeg
console.log("🗜️ Step 3: Compressing raw video using FFmpeg (H.264, Web Optimized)...");
try {
  if (fs.existsSync(finalVideoPath)) {
    fs.unlinkSync(finalVideoPath);
  }

  // Compress using libx264, set parameters from config
  const crf = ffmpegConfig.crf || 22;
  const preset = ffmpegConfig.preset || "fast";
  const pixFmt = ffmpegConfig.pix_fmt || "yuv420p";
  const audioBitrate = ffmpegConfig.audio_bitrate || "128k";
  execSync(`ffmpeg -i "${rawVideoPath}" -vcodec libx264 -crf ${crf} -preset ${preset} -pix_fmt ${pixFmt} -acodec aac -b:a ${audioBitrate} "${finalVideoPath}"`, { stdio: "inherit" });
  console.log(`✅ Compression successful! Final video saved to: ${finalVideoPath}`);
} catch (err) {
  console.warn("⚠️ Warning: FFmpeg compression failed. Keeping the raw uncompressed video as output.", err.message);
  // Copy raw to final as fallback
  fs.copyFileSync(rawVideoPath, finalVideoPath);
}

// 5. Clean up temporary files
console.log("🧹 Step 4: Cleaning up temporary raw render file...");
try {
  const cleanupRaw = ffmpegConfig.cleanup_raw !== false;
  if (cleanupRaw && fs.existsSync(rawVideoPath)) {
    fs.unlinkSync(rawVideoPath);
    console.log("✅ Cleanup complete.");
  } else {
    console.log("⏭️ Cleanup skipped (retaining raw video).");
  }
} catch (err) {
  console.warn("⚠️ Warning: Failed to delete raw video file.", err.message);
}

console.log(`🎉 Done! Video factory run completed for ${lessonName}.`);
