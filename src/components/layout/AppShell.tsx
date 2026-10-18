"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNavDrawer } from "@/components/layout/MobileNavDrawer";
import { CommandPalette } from "@/components/layout/CommandPalette";

const AUTH_PAGES = ["/login", "/signup", "/forgot-password", "/account/update-password"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (AUTH_PAGES.includes(pathname)) return <main className="min-h-screen flex-1">{children}</main>;
  return <>
    <Sidebar />
    <MobileNavDrawer />
    <main className="flex-1 min-h-screen overflow-hidden flex flex-col">{children}</main>
    <CommandPalette />
  </>;
}
