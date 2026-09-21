/**
 * Audits every model in the registry against what the providers actually
 * serve today, and lists anything newly available that we are not using.
 *
 *   npm run audit:models
 *
 * Run this before changing MODEL_SPECS — it is how the retired
 * gemini-2.0-flash and moonshotai/kimi-k2-instruct entries were caught.
 */
import { MODEL_SPECS } from "../src/lib/ai/models";

interface Live {
  id: string;
  detail: string;
}

async function geminiModels(apiKey: string): Promise<Live[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=${apiKey}`
  );
  const body = (await res.json()) as {
    models?: Array<{
      name: string;
      supportedGenerationMethods?: string[];
      inputTokenLimit?: number;
      outputTokenLimit?: number;
    }>;
    error?: { message: string };
  };
  if (!res.ok || body.error) throw new Error(body.error?.message ?? `HTTP ${res.status}`);

  return (body.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => ({
      id: m.name.replace(/^models\//, ""),
      detail: `in ${m.inputTokenLimit ?? "?"} / out ${m.outputTokenLimit ?? "?"}`,
    }));
}

async function groqModels(apiKey: string): Promise<Live[]> {
  const res = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const body = (await res.json()) as {
    data?: Array<{ id: string; context_window?: number; active?: boolean }>;
    error?: { message: string };
  };
  if (!res.ok || body.error) throw new Error(body.error?.message ?? `HTTP ${res.status}`);

  return (body.data ?? []).map((m) => ({
    id: m.id,
    detail: `ctx ${m.context_window ?? "?"}${m.active === false ? " (inactive)" : ""}`,
  }));
}

async function main() {
  const sources = [
    { provider: "gemini" as const, envKey: "GEMINI_API_KEY", fetcher: geminiModels },
    { provider: "groq" as const, envKey: "GROQ_API_KEY", fetcher: groqModels },
  ];

  let problems = 0;

  for (const { provider, envKey, fetcher } of sources) {
    const apiKey = process.env[envKey];
    console.log(`\n── ${provider} ${"─".repeat(60 - provider.length)}`);

    if (!apiKey) {
      console.log(`  SKIP  ${envKey} is not set`);
      problems++;
      continue;
    }

    let live: Live[];
    try {
      live = await fetcher(apiKey);
    } catch (err) {
      console.log(`  FAIL  could not list models: ${err instanceof Error ? err.message : err}`);
      problems++;
      continue;
    }

    const liveById = new Map(live.map((m) => [m.id, m]));
    const configured = MODEL_SPECS.filter((m) => m.provider === provider);

    console.log("  configured:");
    for (const spec of configured) {
      const hit = liveById.get(spec.id);
      if (hit) {
        console.log(`    OK      ${spec.id.padEnd(34)} ${hit.detail}`);
      } else {
        console.log(`    MISSING ${spec.id.padEnd(34)} not served by this key`);
        problems++;
      }
    }

    const unused = live.filter((m) => !configured.some((c) => c.id === m.id));
    if (unused.length) {
      console.log(`  available but unused (${unused.length}):`);
      for (const m of unused) console.log(`    ·       ${m.id.padEnd(34)} ${m.detail}`);
    }
  }

  console.log(
    problems === 0
      ? "\nAll configured models are served by the current keys.\n"
      : `\n${problems} problem(s) found.\n`
  );
  process.exitCode = problems === 0 ? 0 : 1;
}

await main();
