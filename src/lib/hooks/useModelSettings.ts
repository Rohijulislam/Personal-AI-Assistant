"use client";

import { useCallback } from "react";
import type { ModelSettings } from "@/lib/ai";
import { DEFAULT_MODEL_SETTINGS, sanitizeModelSettings } from "@/lib/ai";
import { useUserData } from "@/lib/hooks/useUserData";

export function useModelSettings() {
  const { value, setValue: setSettings, hydrated } =
    useUserData<ModelSettings>("model-settings", "model-settings", DEFAULT_MODEL_SETTINGS);
  const settings = sanitizeModelSettings({ ...DEFAULT_MODEL_SETTINGS, ...value });

  const update = useCallback((patch: Partial<ModelSettings>): void => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, [setSettings]);

  const reset = useCallback((): void => {
    setSettings(DEFAULT_MODEL_SETTINGS);
  }, [setSettings]);

  return { settings, hydrated, update, reset };
}
