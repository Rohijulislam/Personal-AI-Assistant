/** Runs a realistic tool prompt through candidate models to sanity-check output. */
import { geminiClient } from "../src/lib/ai/providers/gemini";
import { groqClient } from "../src/lib/ai/providers/groq";
import type { AIError } from "../src/lib/ai/errors";

const SYSTEM = `You rewrite workplace messages to be clear and professional.
Return ONLY the rewritten message. Keep task IDs exactly as-is. Do not add commentary.`;
const PROMPT = `pls chek the diff D4090 i pushed teh unit test changes yesteday, lmk if anythin looks off`;

const TARGETS: Array<[string, typeof geminiClient]> = [
  ["gemma-4-26b-a4b-it", geminiClient],
  ["gemini-3.8-flash", geminiClient],
  ["qwen/qwen3.8-27b", groqClient],
  ["groq/compound-mini", groqClient],
  ["groq/compound", groqClient],
];

for (const [model, client] of TARGETS) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 40_000);
  const start = Date.now();
  try {
    const text = await client.generate({
      system: SYSTEM, prompt: PROMPT, temperature: 0.3, maxTokens: 300, model, signal: ac.signal,
    });
    console.log(`\n${model}  (${Date.now() - start}ms)\n  ${text.trim().replace(/\n/g, "\n  ")}`);
  } catch (err) {
    console.log(`\n${model}  FAILED [${(err as AIError).code}] ${(err as AIError).message.slice(0, 120)}`);
  } finally {
    clearTimeout(timer);
  }
}
