import { NextRequest, NextResponse } from "next/server";
import { AIError, generateToOutcome, sanitizeModelSettings } from "@/lib/ai";
import type { AIProvider, GenerateOptions } from "@/lib/ai";

export const runtime = "nodejs";

/** Error codes the caller caused, which deserve a 4xx rather than a 5xx. */
const CLIENT_FAULT = new Set(["bad_request", "content_filter"]);

function statusFor(error: AIError): number {
  if (error.code === "cancelled") return 499; // client closed request
  if (error.code === "timeout") return 504;
  if (error.code === "rate_limit") return 429;
  if (error.code === "auth") return 502; // our key is bad, not the caller's
  if (CLIENT_FAULT.has(error.code)) return 400;
  return 502;
}

function readOptions(body: unknown): GenerateOptions | { error: string } {
  if (typeof body !== "object" || body === null) return { error: "Body must be an object" };
  const b = body as Record<string, unknown>;

  if (typeof b.prompt !== "string" || b.prompt.trim() === "") {
    return { error: "prompt is required" };
  }
  if (b.system !== undefined && typeof b.system !== "string") {
    return { error: "system must be a string" };
  }
  if (b.maxTokens !== undefined && (typeof b.maxTokens !== "number" || b.maxTokens <= 0)) {
    return { error: "maxTokens must be a positive number" };
  }
  if (
    b.temperature !== undefined &&
    (typeof b.temperature !== "number" || b.temperature < 0 || b.temperature > 2)
  ) {
    return { error: "temperature must be between 0 and 2" };
  }
  if (b.forceProvider !== undefined && b.forceProvider !== "gemini" && b.forceProvider !== "groq") {
    return { error: "forceProvider must be 'gemini' or 'groq'" };
  }
  if (b.timeoutMs !== undefined && (typeof b.timeoutMs !== "number" || b.timeoutMs <= 0)) {
    return { error: "timeoutMs must be a positive number" };
  }

  return {
    prompt: b.prompt.trim(),
    system: b.system as string | undefined,
    maxTokens: b.maxTokens as number | undefined,
    temperature: b.temperature as number | undefined,
    forceProvider: b.forceProvider as AIProvider | undefined,
    timeoutMs: b.timeoutMs as number | undefined,
    stream: b.stream === true,
    // Never trusted verbatim: unknown providers/models fall back to defaults.
    modelSettings: sanitizeModelSettings(b.modelSettings),
  };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body", code: "bad_request" }, { status: 400 });
  }

  const parsed = readOptions(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error, code: "bad_request" }, { status: 400 });
  }

  // When the browser goes away mid-request, stop paying the provider for it.
  const options: GenerateOptions = { ...parsed, signal: req.signal };

  return options.stream ? streamResponse(options) : jsonResponse(options);
}

async function jsonResponse(options: GenerateOptions) {
  const outcome = await generateToOutcome(options);

  if (outcome.status === "success") return NextResponse.json(outcome.result);

  const { error } = outcome;
  console.error(`[/api/generate] ${error.code}: ${error.message}`);
  return NextResponse.json(error.toJSON(), { status: statusFor(error) });
}

/**
 * Server-sent events. Three frame types, so the client can distinguish a
 * stream that ended cleanly from one that died mid-flight:
 *
 *   {"type":"delta","text":"..."}
 *   {"type":"done","result":{...}}
 *   {"type":"error","error":"...","code":"..."}
 */
function streamResponse(options: GenerateOptions) {
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (payload: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          closed = true; // consumer detached
        }
      };

      const outcome = await generateToOutcome(options, {
        onToken: (delta) => send({ type: "delta", text: delta }),
      });

      if (outcome.status === "success") {
        send({ type: "done", result: outcome.result });
      } else {
        const { error } = outcome;
        if (error.code !== "cancelled") {
          console.error(`[/api/generate:stream] ${error.code}: ${error.message}`);
        }
        send({ type: "error", ...error.toJSON() });
      }

      closed = true;
      try {
        controller.close();
      } catch {
        /* already closed by the consumer detaching */
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
