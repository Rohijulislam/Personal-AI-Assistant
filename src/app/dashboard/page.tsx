"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { navItems } from "@/lib/nav-items";
import { ToolCard } from "@/components/tools/ToolCard";
import { Skeleton, SkeletonLines } from "@/components/ui/Skeleton";
import { WeeklyActivityChart, ToolBarBreakdown, ToolIcon, toolLabel } from "@/components/tools/UsageCharts";
import { useUsageLog } from "@/lib/hooks/useUsageLog";
import { useCommandLibrary } from "@/lib/hooks/useCommandLibrary";
import { useSavedInstructions } from "@/lib/hooks/useSavedInstructions";
import { lastNDaysCounts, toolCounts, weekOverWeek, relativeTimeFromNow } from "@/lib/usage-stats";
import { useAppUI } from "@/components/layout/AppUIProvider";
import { DashboardTaskPanel } from "@/components/tasks/DashboardTaskPanel";
import { Menu, Zap, Terminal, BookMarked, TrendingUp, TrendingDown, ArrowRight, ArrowUpRight, BrainCircuit, MessageSquare, Sparkles, Clock3 } from "lucide-react";

function getGreeting(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { entries, hydrated: usageHydrated } = useUsageLog();
  const { commands, hydrated: commandsHydrated } = useCommandLibrary();
  const { instructions, hydrated: instructionsHydrated } = useSavedInstructions();
  const { setMobileNavOpen } = useAppUI();
  const [mounted, setMounted] = useState(false);
  const ready = usageHydrated && commandsHydrated && instructionsHydrated;

  useEffect(() => {
    document.title = "Dashboard · My Assistant";
    // The greeting uses the visitor's local time, so show it after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const now = new Date();
  const dailyCounts = lastNDaysCounts(entries, 7);
  const totalThisWeek = dailyCounts.reduce((sum, day) => sum + day.count, 0);
  const topTools = toolCounts(entries, 7).slice(0, 3);
  const { thisWeek, lastWeek } = weekOverWeek(entries);
  const recent = entries.slice(0, 4);
  const aiTools = navItems.filter((item) => ["daily-status", "prompt-rewriter", "text-refiner", "task-generator"].includes(item.id));
  const libraryTools = navItems.filter((item) => ["command-library", "saved-instructions", "history"].includes(item.id));

  return <div className="flex h-full min-h-0 min-w-0 flex-col">
    <header className="flex items-center gap-3 border-b border-border bg-surface-raised px-4 py-4 sm:px-8">
      <button onClick={() => setMobileNavOpen(true)} className="-ml-1 rounded-lg p-1.5 text-text-muted hover:bg-surface-sunken sm:hidden" aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
      <div className="min-w-0 flex-1"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Workspace</p><h1 className="text-sm font-semibold text-text-primary">Dashboard</h1></div>
      <span className="hidden text-xs text-text-muted sm:block">{mounted ? now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "Your workspace"}</span>
    </header>
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 pb-10">
        <DashboardTaskPanel />
        <section className="relative overflow-hidden rounded-2xl border border-border bg-surface-raised p-6 sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full border border-accent/10" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-2 -top-10 h-52 w-52 rounded-full border border-accent/10" aria-hidden="true" />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/15 bg-accent-subtle px-2.5 py-1 text-[11px] font-semibold text-accent"><Sparkles className="h-3 w-3" aria-hidden="true" /> Your AI workspace</span>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl lg:text-4xl">{mounted ? `${getGreeting(now.getHours())}.` : "Welcome back."}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-text-secondary sm:text-base">Turn an idea into a clear result. Pick up a conversation, run a focused tool, or explore your saved work.</p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link href="/command-center" className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Open Command Center <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
              <Link href="/chat" className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:border-accent/50 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><MessageSquare className="h-4 w-4" aria-hidden="true" /> Start a chat</Link>
            </div>
          </div>
        </section>

        <section aria-label="Workspace overview" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {!ready ? <><Skeleton className="h-28 rounded-xl" /><Skeleton className="h-28 rounded-xl" /><Skeleton className="h-28 rounded-xl" /></> : <>
            <OverviewStat icon={Zap} label="Generations" value={entries.length} detail="Results created" trend={thisWeek > 0 || lastWeek > 0 ? <TrendChip delta={thisWeek - lastWeek} /> : undefined} />
            <OverviewStat icon={Terminal} label="Saved commands" value={commands.length} detail="Ready to reuse" href="/command-library" />
            <OverviewStat icon={BookMarked} label="Instructions" value={instructions.length} detail="Personalized prompts" href="/saved-instructions" />
          </>}
        </section>

        <div className="grid grid-cols-1 items-start gap-7 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="min-w-0 space-y-8">
            <section>
              <SectionHeading eyebrow="Get started" title="Choose how to work" description="Start with a flexible assistant or jump into a focused task." />
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <FeaturedLink href="/command-center" icon={BrainCircuit} title="Command Center" description="Describe a goal and let the assistant find the right workflow." />
                <FeaturedLink href="/chat" icon={MessageSquare} title="Chat" description="Think through ideas, ask questions, and keep the conversation going." variant="info" />
              </div>
            </section>
            <section><SectionHeading eyebrow="Focus" title="AI tools" description="Purpose-built helpers for the work you do every day." /><div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">{aiTools.map((item) => <ToolCard key={item.id} item={item} />)}</div></section>
            <section><SectionHeading eyebrow="Keep it organized" title="Your library" description="Find, reuse, and review your saved work." /><div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">{libraryTools.map((item) => <ToolCard key={item.id} item={item} />)}</div></section>
          </div>
          <aside className="space-y-4" aria-label="Activity">
            <section className="overflow-hidden rounded-xl border border-border bg-surface-raised">
              <div className="flex items-start justify-between gap-3 border-b border-border-subtle px-5 py-4"><div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Activity</p><h2 className="mt-1 text-sm font-semibold text-text-primary">Recent work</h2></div><Clock3 className="h-4 w-4 text-text-muted" aria-hidden="true" /></div>
              <div className="space-y-1 p-3">
                {!ready ? <div className="p-2"><SkeletonLines lines={3} /></div> : recent.length === 0 ? <div className="px-2 py-4 text-sm leading-5 text-text-muted">Your latest results will appear here once you use a tool.</div> : recent.map((entry) => <div key={entry.id} className="flex gap-3 rounded-lg px-2 py-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-sunken"><ToolIcon toolId={entry.toolId} className="h-4 w-4 text-text-secondary" /></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-semibold text-text-primary">{toolLabel(entry.toolId)}</span><span className="shrink-0 text-[10px] tabular-nums text-text-muted">{relativeTimeFromNow(entry.createdAt)}</span></div><p className="mt-1 truncate text-xs text-text-muted">{entry.text}</p></div></div>)}
              </div>
              <Link href="/history" className="flex items-center justify-between border-t border-border-subtle px-5 py-3 text-xs font-semibold text-accent transition-colors hover:bg-accent-subtle">View full history <ArrowRight className="h-3.5 w-3.5" /></Link>
            </section>
            <section className="rounded-xl border border-border bg-surface-raised p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">This week</p><div className="mt-1 flex items-baseline gap-2"><span className="text-2xl font-semibold tracking-tight tabular-nums text-text-primary">{ready ? totalThisWeek : "—"}</span><span className="text-xs text-text-muted">generations</span></div><div className="mt-5">{!ready ? <Skeleton className="h-24" /> : <WeeklyActivityChart data={dailyCounts} />}</div></section>
            <section className="rounded-xl border border-border bg-surface-raised p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Your favorites</p><h2 className="mt-1 text-sm font-semibold text-text-primary">Most used tools</h2><div className="mt-5">{!ready ? <SkeletonLines lines={3} /> : <ToolBarBreakdown data={topTools} />}</div></section>
          </aside>
        </div>
      </div>
    </div>
  </div>;
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-text-primary sm:text-xl">{title}</h2><p className="mt-1 text-sm text-text-muted">{description}</p></div>;
}

function FeaturedLink({ href, icon: Icon, title, description, variant = "accent" }: { href: string; icon: React.ComponentType<{ className?: string }>; title: string; description: string; variant?: "accent" | "info" }) {
  return <Link href={href} className="group flex min-h-36 flex-col justify-between rounded-xl border border-border bg-surface-raised p-5 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><div className="flex items-start justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-lg ${variant === "info" ? "bg-info-subtle text-info" : "bg-accent-subtle text-accent"}`}><Icon className="h-5 w-5" /></span><ArrowUpRight className="h-4 w-4 text-text-muted transition-colors group-hover:text-accent" /></div><div className="mt-5"><h3 className="text-base font-semibold text-text-primary">{title}</h3><p className="mt-1 text-sm leading-5 text-text-muted">{description}</p></div></Link>;
}

function TrendChip({ delta }: { delta: number }) {
  if (delta === 0) return null;
  const positive = delta > 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return <span className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${positive ? "text-success" : "text-danger"}`}><Icon className="h-3.5 w-3.5" />{Math.abs(delta)} vs last week</span>;
}

function OverviewStat({ icon: Icon, value, label, detail, trend, href }: { icon: React.ComponentType<{ className?: string }>; value: number; label: string; detail: string; trend?: React.ReactNode; href?: string }) {
  const content = <><div className="flex items-center justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-subtle text-accent"><Icon className="h-4 w-4" /></span>{href && <ArrowUpRight className="h-4 w-4 text-text-muted transition-colors group-hover:text-accent" />}</div><div className="mt-4 flex items-baseline gap-2"><span className="text-2xl font-semibold tracking-tight tabular-nums text-text-primary">{value}</span><span className="text-sm font-medium text-text-secondary">{label}</span></div><div className="mt-1 flex items-center gap-2 text-xs text-text-muted"><span>{detail}</span>{trend}</div></>;
  const className = "group rounded-xl border border-border bg-surface-raised px-5 py-4 transition-colors hover:border-accent/40";
  return href ? <Link href={href} className={className}>{content}</Link> : <div className={className}>{content}</div>;
}
