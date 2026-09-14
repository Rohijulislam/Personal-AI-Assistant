import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNavDrawer } from "@/components/layout/MobileNavDrawer";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { AppUIProvider } from "@/components/layout/AppUIProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Assistant",
  description: "Personal AI productivity tools",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex bg-surface text-text-primary">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AppUIProvider>
            <Sidebar />
            <MobileNavDrawer />
            <main className="flex-1 min-h-screen overflow-hidden flex flex-col">
              {children}
            </main>
            <CommandPalette />
          </AppUIProvider>
          <Toaster
            position="bottom-right"
            theme="system"
            toastOptions={{
              className:
                "!bg-surface-raised !text-text-primary !border !border-border",
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
