"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNavDrawer } from "@/components/layout/MobileNavDrawer";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { TaskUrgencyBanner } from "@/components/layout/TaskUrgencyBanner";

const AUTH_PAGES = ["/login", "/signup", "/forgot-password", "/account/update-password"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (AUTH_PAGES.includes(pathname)) return <main className="min-h-dvh min-w-0 flex-1">{children}</main>;
  return <>
    <Sidebar />
    <MobileNavDrawer />
    <main className="min-h-0 min-w-0 h-dvh flex-1 overflow-hidden flex flex-col"><TaskUrgencyBanner />{children}</main>
    <CommandPalette />
  </>;
}
