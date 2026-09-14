import Groq from "groq-sdk";
import type { AIProviderClient, GenerateOptions } from "./types";

const MODEL = "llama-3.3-70b-versatile";

export const groqClient: AIProviderClient = {
  name: "groq",
  model: MODEL,

  async generate(
    { system, prompt, maxTokens, temperature }: GenerateOptions,
    modelOverride?: string
  ): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not set");

    const groq = new Groq({ apiKey });
    const model = modelOverride || MODEL;

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: prompt });

    const completion = await groq.chat.completions.create({
      model,
      messages,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
      ...(temperature !== undefined ? { temperature } : {}),
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) throw new Error("Groq returned an empty response");
    return text;
  },
};
