import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import Link from "next/link";
import { ArrowUpRight, Cloud, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { AccountProfileForm } from "@/components/auth/AccountProfileForm";
import { DataManager } from "@/components/auth/DataManager";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ "password-updated"?: string }> }) {
  if (!isSupabaseConfigured()) {
    return <PageShell title="Account" description="Manage your profile and sign-in details" icon="Settings">
      <div className="max-w-2xl rounded-xl border border-border bg-surface-raised p-5 text-sm text-text-secondary">
        Configure <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to enable account management.
      </div>
    </PageShell>;
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const name = String(user.user_metadata?.display_name ?? "");
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || user.email?.[0]?.toUpperCase() || "A";
  return <PageShell title="Account" description="Profile, security, and your data" icon="Settings">
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      {params["password-updated"] && <p role="status" className="rounded-lg bg-accent-subtle px-4 py-3 text-sm text-accent">Your password has been updated.</p>}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-raised p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-accent/10" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-5 -top-12 h-44 w-44 rounded-full border border-accent/10" aria-hidden="true" />
        <div className="relative flex flex-wrap items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent-subtle text-xl font-bold tracking-tight text-accent">{initials}</div>
          <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Your workspace</p><h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-text-primary sm:text-2xl">{name || "My account"}</h2><p className="mt-1 truncate text-sm text-text-muted">{user.email}</p></div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success-subtle px-3 py-1.5 text-xs font-semibold text-success"><ShieldCheck className="h-3.5 w-3.5" /> Protected account</span>
        </div>
      </div>
      <section className="rounded-2xl border border-border bg-surface-raised p-5 sm:p-7">
        <div className="mb-6 flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-subtle text-accent"><UserRound className="h-5 w-5" /></span><div><h2 className="text-base font-semibold text-text-primary">Profile details</h2><p className="mt-1 text-sm text-text-muted">Update the name and email linked to your account.</p></div></div>
        <AccountProfileForm name={name} email={user.email ?? ""} />
      </section>
      <section className="rounded-2xl border border-border bg-surface-raised p-5 sm:p-7">
        <div className="mb-6 flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-info-subtle text-info"><Cloud className="h-5 w-5" /></span><div><h2 className="text-base font-semibold text-text-primary">Your data</h2><p className="mt-1 text-sm text-text-muted">Back up your workspace or bring in saved content from another account.</p></div></div>
        <DataManager />
      </section>
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface-raised p-5 sm:p-7">
        <div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-sunken text-text-secondary"><KeyRound className="h-5 w-5" /></span><div><h2 className="text-base font-semibold text-text-primary">Password & security</h2><p className="mt-1 text-sm text-text-muted">Get a secure email link to change your password.</p></div></div>
        <Link href="/forgot-password" className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:border-accent hover:text-accent">Reset password <ArrowUpRight className="h-4 w-4" /></Link>
      </section>
    </div>
  </PageShell>;
}
