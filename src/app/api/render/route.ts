import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";

export async function POST(request: NextRequest) {
  try {
    execSync("node run-factory.js --lesson=ohm-law", { stdio: "pipe" });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}