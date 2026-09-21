/**
 * Samples each model several times to measure pass rate and latency.
 *
 *   npm run probe:reliability
 *
 * This is what distinguished gemini-2.5-flash (3/3 at ~1.2s) from the 3.x
 * flash tier (2/3 at 4–16s, intermittent 503 "high demand") when choosing the
 * shipped set. Re-run it before promoting a model to primary.
 */
import { geminiClient } from "../src/lib/ai/providers/gemini";
import { groqClient } from "../src/lib/ai/providers/groq";
import { MODEL_SPECS } from "../src/lib/ai/models";
import type { AIError } from "../src/lib/ai/errors";
import type { AIProvider } from "../src/lib/ai/types";

const CLIENTS = { gemini: geminiClient, groq: groqClient } as const;
const ROUNDS = Number(process.argv[2] ?? 3);
const extra = process.argv.slice(3);

const targets: Array<{ provider: AIProvider; id: string }> = extra.length
  ? extra.map((id) => ({ provider: id.includes("/") ? "groq" : "gemini", id }))
  : MODEL_SPECS.map((m) => ({ provider: m.provider, id: m.id }));

console.log(`\nsampling ${targets.length} model(s) × ${ROUNDS} rounds\n`);

for (const { provider, id } of targets) {
  const results: string[] = [];
  for (let i = 0; i < ROUNDS; i++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 40_000);
    const start = Date.now();
    try {
      await CLIENTS[provider].generate({
        prompt: "Reply with the single word: ready",
        temperature: 0,
        model: id,
        signal: ac.signal,
      });
      results.push(`ok/${Date.now() - start}ms`);
    } catch (err) {
      results.push(`${(err as AIError).code}/${Date.now() - start}ms`);
    } finally {
      clearTimeout(timer);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  const passes = results.filter((r) => r.startsWith("ok")).length;
  console.log(`  ${id.padEnd(26)} ${passes}/${ROUNDS} pass  [${results.join(", ")}]`);
}
