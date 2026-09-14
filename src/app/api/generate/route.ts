import { NextRequest, NextResponse } from "next/server";
import { generate } from "@/lib/ai";
import type { GenerateOptions } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: Partial<GenerateOptions>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { prompt, system, maxTokens, temperature, forceProvider, modelSettings } = body;

  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  try {
    const result = await generate({
      prompt: prompt.trim(),
      system,
      maxTokens,
      temperature,
      forceProvider,
      modelSettings,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/generate]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
