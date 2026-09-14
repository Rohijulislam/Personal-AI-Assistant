"use client";

import { createContext, useContext, useState, useMemo, Dispatch, SetStateAction } from "react";

interface AppUIContextValue {
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: Dispatch<SetStateAction<boolean>>;
  mobileNavOpen: boolean;
  setMobileNavOpen: Dispatch<SetStateAction<boolean>>;
}

const AppUIContext = createContext<AppUIContextValue | null>(null);

export function AppUIProvider({ children }: { children: React.ReactNode }) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const value = useMemo(
    () => ({
      commandPaletteOpen,
      setCommandPaletteOpen,
      mobileNavOpen,
      setMobileNavOpen,
    }),
    [commandPaletteOpen, mobileNavOpen]
  );

  return <AppUIContext.Provider value={value}>{children}</AppUIContext.Provider>;
}

export function useAppUI(): AppUIContextValue {
  const ctx = useContext(AppUIContext);
  if (!ctx) throw new Error("useAppUI must be used within AppUIProvider");
  return ctx;
}
