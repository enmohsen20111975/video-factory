import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const dataPath = path.join(process.cwd(), "src/data/ohm-law.json");
    const data = JSON.parse(await fs.readFile(dataPath, "utf-8"));
    return NextResponse.json({ voiceoverText: data.voiceoverText || data.introText || "" });
  } catch {
    return NextResponse.json({ voiceoverText: "" });
  }
}

export async function POST(request: NextRequest) {
  const { text, voice, lesson = "ohm-law" } = await request.json();
  
  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const pyScript = path.join(process.cwd(), "scripts/generate_tts.py");
  const audioPath = path.join(process.cwd(), `public/voiceovers/${lesson}.mp3`);
  const tsPath = path.join(process.cwd(), `public/timestamps/${lesson}.json`);
  
  await fs.mkdir(path.dirname(audioPath), { recursive: true });
  await fs.mkdir(path.dirname(tsPath), { recursive: true });

  try {
    const { execSync } = require("child_process");
    execSync(
      `python "${pyScript}" --text "${text}" --voice ${voice} --output-audio "${audioPath}" --output-timestamps "${tsPath}"`,
      { stdio: "pipe" }
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}