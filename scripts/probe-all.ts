/** Enumerates every text-capable model both keys serve, then probes each one. */
import { geminiClient } from "../src/lib/ai/providers/gemini";
import { groqClient } from "../src/lib/ai/providers/groq";
import type { AIError } from "../src/lib/ai/errors";

const EXCLUDE = /embedding|aqa|imagen|veo|tts|whisper|orpheus|image|nano-banana|lyria|transcribe|prompt-guard|robotics|computer-use|deep-research|antigravity|live|native-audio|guard/i;

async function geminiIds(key: string): Promise<string[]> {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=${key}`).then((x) => x.json());
  return (r.models ?? [])
    .filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m: { name: string }) => m.name.replace(/^models\//, ""))
    .filter((id: string) => !EXCLUDE.test(id));
}

async function groqIds(key: string): Promise<string[]> {
  const r = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${key}` } }).then((x) => x.json());
  return (r.data ?? []).map((m: { id: string }) => m.id).filter((id: string) => !EXCLUDE.test(id));
}

async function probe(client: typeof geminiClient, model: string) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 30_000);
  const start = Date.now();
  try {
    const text = await client.generate({
      system: "You are terse. Reply with exactly one word, no punctuation.",
      prompt: "What is the capital of France? City name only.",
      temperature: 0,
      maxTokens: 64, // tight on purpose: catches reasoning-budget starvation
      model,
      signal: ac.signal,
    });
    return { ok: true as const, ms: Date.now() - start, text: text.trim().slice(0, 24) };
  } catch (err) {
    const e = err as AIError;
    return { ok: false as const, ms: Date.now() - start, code: e.code };
  } finally {
    clearTimeout(timer);
  }
}

const gKey = process.env.GEMINI_API_KEY!;
const qKey = process.env.GROQ_API_KEY!;
const groups = [
  { client: geminiClient, ids: await geminiIds(gKey) },
  { client: groqClient, ids: await groqIds(qKey) },
];

for (const { client, ids } of groups) {
  console.log(`\n── ${client.name} (${ids.length} candidates) ──`);
  for (const id of ids) {
    const r = await probe(client, id);
    console.log(
      r.ok
        ? `  PASS  ${id.padEnd(34)} ${String(r.ms).padStart(6)}ms  "${r.text}"`
        : `  fail  ${id.padEnd(34)} ${String(r.ms).padStart(6)}ms  [${r.code}]`
    );
  }
}
