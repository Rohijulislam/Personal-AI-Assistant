import { geminiClient } from "./gemini";
import { groqClient } from "./groq";
import { DEFAULT_MODEL_SETTINGS } from "./models";
import type { AIProviderClient, GenerateOptions, GenerateResult } from "./types";

const CLIENTS: Record<string, AIProviderClient> = {
  gemini: geminiClient,
  groq: groqClient,
};

/**
 * Generate text using the configured default (primary) provider/model.
 * Falls back to the configured backup provider/model if the primary fails
 * and backup is enabled — unless a specific provider was force-selected.
 */
export async function generate(options: GenerateOptions): Promise<GenerateResult> {
  const settings = options.modelSettings ?? DEFAULT_MODEL_SETTINGS;

  const primaryProvider = options.forceProvider ?? settings.primaryProvider;
  const primaryModel = options.forceProvider ? undefined : settings.primaryModel;
  const primary = CLIENTS[primaryProvider];

  const backupEligible = !options.forceProvider && settings.enableBackup;
  const fallback =
    backupEligible && settings.backupProvider !== primaryProvider
      ? CLIENTS[settings.backupProvider]
      : null;

  try {
    const text = await primary.generate(options, primaryModel);
    return { text, provider: primary.name, model: primaryModel || primary.model };
  } catch (primaryError) {
    if (!fallback) throw primaryError;

    console.warn(
      `[AI] ${primary.name} failed — falling back to ${fallback.name}.`,
      primaryError instanceof Error ? primaryError.message : primaryError
    );

    try {
      const text = await fallback.generate(options, settings.backupModel);
      return { text, provider: fallback.name, model: settings.backupModel || fallback.model };
    } catch (fallbackError) {
      console.error("[AI] Fallback provider also failed.", fallbackError);
      throw new Error(
        `Both AI providers failed. Last error: ${
          fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        }`
      );
    }
  }
}
