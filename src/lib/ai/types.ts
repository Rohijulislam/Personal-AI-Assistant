export type AIProvider = "gemini" | "groq";

/** User-configurable default/backup provider + model, persisted in Settings */
export interface ModelSettings {
  primaryProvider: AIProvider;
  primaryModel: string;
  backupProvider: AIProvider;
  backupModel: string;
  /** Whether to fall back to the backup model when the primary one fails */
  enableBackup: boolean;
}

export interface GenerateOptions {
  /** System-level instruction for the model */
  system?: string;
  /** The user prompt / input content */
  prompt: string;
  /** Max output tokens (optional, provider default if omitted) */
  maxTokens?: number;
  /** Temperature 0–1 (optional) */
  temperature?: number;
  /** Force a specific provider instead of auto-selecting, skipping the backup */
  forceProvider?: AIProvider;
  /** Default/backup provider + model to use, from the Settings page */
  modelSettings?: ModelSettings;
}

export interface GenerateResult {
  text: string;
  provider: AIProvider;
  model: string;
}

export interface AIProviderClient {
  name: AIProvider;
  model: string;
  generate(options: GenerateOptions, modelOverride?: string): Promise<string>;
}
