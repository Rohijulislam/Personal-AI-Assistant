"use client";

import { useEffect, useState } from "react";
import { useUserData } from "@/lib/hooks/useUserData";
import type { PersonalTask } from "@/lib/personal-tasks";

export function usePersonalTasks() {
  return useUserData<PersonalTask[]>("personal-tasks", "personal-tasks", []);
}

/** Refresh urgency when a deadline passes, a day changes, or the tab wakes up. */
export function useTaskClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const onVisibility = () => { if (!document.hidden) refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    const interval = window.setInterval(refresh, 30_000);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, []);
  return now;
}
