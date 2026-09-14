import type { AIProvider, ModelSettings } from "./types";

export interface ModelOption {
  id: string;
  label: string;
}

/** Selectable models per provider, shown on the Settings page */
export const PROVIDER_MODELS: Record<AIProvider, ModelOption[]> = {
  gemini: [
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile" },
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
    { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B" },
    { id: "moonshotai/kimi-k2-instruct", label: "Kimi K2 Instruct" },
  ],
};

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  gemini: "Google Gemini",
  groq: "Groq",
};

export const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  primaryProvider: "gemini",
  primaryModel: "gemini-2.5-flash",
  backupProvider: "groq",
  backupModel: "llama-3.3-70b-versatile",
  enableBackup: true,
};
