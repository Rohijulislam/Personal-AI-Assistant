"use client";

import { useState, useEffect, useCallback } from "react";
import type { ModelSettings } from "@/lib/ai";
import { DEFAULT_MODEL_SETTINGS } from "@/lib/ai";

const STORAGE_KEY = "model-settings";

function loadFromStorage(): ModelSettings {
  if (typeof window === "undefined") return DEFAULT_MODEL_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_MODEL_SETTINGS, ...(JSON.parse(raw) as ModelSettings) } : DEFAULT_MODEL_SETTINGS;
  } catch {
    return DEFAULT_MODEL_SETTINGS;
  }
}

function saveToStorage(settings: ModelSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // storage quota exceeded or unavailable — fail silently
  }
}

export function useModelSettings() {
  const [settings, setSettings] = useState<ModelSettings>(DEFAULT_MODEL_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setSettings(loadFromStorage());
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (hydrated) saveToStorage(settings);
  }, [settings, hydrated]);

  const update = useCallback((patch: Partial<ModelSettings>): void => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback((): void => {
    setSettings(DEFAULT_MODEL_SETTINGS);
  }, []);

  return { settings, hydrated, update, reset };
}
