import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { AppUIProvider } from "@/components/layout/AppUIProvider";
import { AppShell } from "@/components/layout/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "My Assistant — Personal AI Toolkit",
    template: "%s · My Assistant",
  },
  description:
    "A personal AI productivity toolkit — daily status formatting, prompt rewriting, text refinement, task generation, and a searchable library of commands and instructions.",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#14120e" },
  ],
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
      <body className="h-full flex bg-surface text-text-primary" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AppUIProvider>
            <AppShell>{children}</AppShell>
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
