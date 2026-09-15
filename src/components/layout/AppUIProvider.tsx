"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  Dispatch,
  SetStateAction,
} from "react";

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

interface AppUIContextValue {
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: Dispatch<SetStateAction<boolean>>;
  mobileNavOpen: boolean;
  setMobileNavOpen: Dispatch<SetStateAction<boolean>>;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
}

const AppUIContext = createContext<AppUIContextValue | null>(null);

export function AppUIProvider({ children }: { children: React.ReactNode }) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Read persisted preference after mount so server and first client
    // render match (avoids a hydration mismatch), same pattern as the
    // theme toggle's "mounted" flag.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
  }, []);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  const value = useMemo(
    () => ({
      commandPaletteOpen,
      setCommandPaletteOpen,
      mobileNavOpen,
      setMobileNavOpen,
      sidebarCollapsed,
      setSidebarCollapsed,
    }),
    [commandPaletteOpen, mobileNavOpen, sidebarCollapsed]
  );

  return <AppUIContext.Provider value={value}>{children}</AppUIContext.Provider>;
}

export function useAppUI(): AppUIContextValue {
  const ctx = useContext(AppUIContext);
  if (!ctx) throw new Error("useAppUI must be used within AppUIProvider");
  return ctx;
}
