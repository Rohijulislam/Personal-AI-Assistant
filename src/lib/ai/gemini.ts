import { GoogleGenAI } from "@google/genai";
import type { AIProviderClient, GenerateOptions } from "./types";

const MODEL = "gemini-2.5-flash";

export const geminiClient: AIProviderClient = {
  name: "gemini",
  model: MODEL,

  async generate(
    { system, prompt, maxTokens, temperature }: GenerateOptions,
    modelOverride?: string
  ): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

    const ai = new GoogleGenAI({ apiKey });
    const model = modelOverride || MODEL;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        ...(system ? { systemInstruction: system } : {}),
        ...(maxTokens ? { maxOutputTokens: maxTokens } : {}),
        ...(temperature !== undefined ? { temperature } : {}),
      },
    });

    const text = response.text;
    if (!text) throw new Error("Gemini returned an empty response");
    return text;
  },
};
