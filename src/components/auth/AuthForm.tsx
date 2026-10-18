"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, KeyRound, UserRound, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { signIn, signUp, requestPasswordReset, updatePassword, type AuthActionState } from "@/app/actions/auth";

type Mode = "login" | "signup" | "forgot" | "update-password";

const actionByMode = {
  login: signIn,
  signup: signUp,
  forgot: requestPasswordReset,
  "update-password": updatePassword,
};

const copy: Record<Mode, { title: string; description: string; submit: string }> = {
  login: { title: "Welcome back", description: "Sign in to continue to your personal workspace.", submit: "Sign in" },
  signup: { title: "Create your account", description: "Save your workspace and pick up on any device.", submit: "Create account" },
  forgot: { title: "Reset your password", description: "We’ll email you a link to choose a new password.", submit: "Send reset link" },
  "update-password": { title: "Choose a new password", description: "Set a new password for your account.", submit: "Update password" },
};

export function AuthForm({ mode, next = "/dashboard", callbackError = false }: { mode: Mode; next?: string; callbackError?: boolean }) {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(actionByMode[mode], {});
  const content = copy[mode];
  return (
    <main className="min-h-screen bg-surface p-4 sm:p-7 lg:flex lg:items-center lg:justify-center">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-[0_20px_80px_-40px_var(--text-primary)] sm:min-h-[calc(100vh-3.5rem)] lg:min-h-[680px] lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden bg-surface-sunken p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full border border-accent/15" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-9 -top-16 h-72 w-72 rounded-full border border-accent/15" aria-hidden="true" />
          <Link href="/login" className="relative flex items-center gap-3 text-lg font-semibold text-text-primary"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-lg font-bold text-white">A</span>My Assistant</Link>
          <div className="relative max-w-md">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-subtle px-3 py-1.5 text-xs font-semibold tracking-wide text-accent"><Sparkles className="h-3.5 w-3.5" /> YOUR PERSONAL WORKSPACE</span>
            <h2 className="mt-6 text-4xl font-semibold leading-[1.12] tracking-tight text-text-primary xl:text-5xl">A clear space for<br /><span className="text-accent">better work.</span></h2>
            <p className="mt-5 text-base leading-7 text-text-secondary">Your tools, notes, conversations, and ideas in one focused place. Come back to your work from anywhere.</p>
            <div className="mt-9 space-y-4">{[
              "Keep every saved instruction and command close",
              "Return to conversations and unfinished drafts",
              "Bring your work with you using JSON backups",
            ].map((item) => <div key={item} className="flex items-start gap-3 text-sm text-text-secondary"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-accent"><Check className="h-3 w-3" /></span>{item}</div>)}</div>
          </div>
          <div className="relative flex items-center gap-2 border-t border-border pt-5 text-xs text-text-muted"><ShieldCheck className="h-4 w-4 text-success" /> Your workspace is protected by your account.</div>
        </aside>
        <section className="flex min-h-[calc(100vh-2rem)] flex-col p-6 sm:min-h-[calc(100vh-3.5rem)] sm:p-10 lg:min-h-0 lg:p-12 xl:p-16">
          <div className="flex items-center justify-between gap-3 lg:justify-end"><Link href="/login" className="flex items-center gap-2 text-sm font-semibold text-text-primary lg:hidden"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-bold text-white">A</span>My Assistant</Link>{mode === "login" ? <Link href="/signup" className="text-sm font-semibold text-accent hover:underline">Create account <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link> : <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-accent"><ArrowLeft className="h-3.5 w-3.5" /> Sign in</Link>}</div>
          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12 lg:py-8">
          <p className="text-xs font-bold tracking-[0.15em] text-accent">{mode === "login" ? "YOUR WORKSPACE" : mode === "signup" ? "GET STARTED" : "ACCOUNT RECOVERY"}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">{content.title}</h1>
          <p className="mt-3 text-sm leading-6 text-text-muted">{content.description}</p>
          <form action={action} className="mt-9 space-y-5">
            {mode === "signup" && <Field label="Name" name="name" type="text" placeholder="Your name" icon={<UserRound className="w-4 h-4" />} autoComplete="name" required />}
            {mode !== "update-password" && <Field label="Email" name="email" type="email" placeholder="you@example.com" icon={<Mail className="w-4 h-4" />} autoComplete="email" required />}
            {mode === "login" && <input type="hidden" name="next" value={next} />}
            {(mode === "login" || mode === "signup") && <Field label="Password" name="password" type="password" placeholder={mode === "signup" ? "At least 8 characters" : "Your password"} icon={<KeyRound className="w-4 h-4" />} autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={mode === "signup" ? 8 : undefined} />}
            {mode === "update-password" && <>
              <Field label="New password" name="password" type="password" placeholder="At least 8 characters" icon={<KeyRound className="w-4 h-4" />} autoComplete="new-password" required minLength={8} />
              <Field label="Confirm new password" name="confirmation" type="password" placeholder="Repeat your new password" icon={<KeyRound className="w-4 h-4" />} autoComplete="new-password" required minLength={8} />
            </>}
            {callbackError && !state.message && <p role="alert" className="rounded-lg bg-danger-subtle px-3 py-2.5 text-sm text-danger">That confirmation or reset link could not be used. It may have expired. Request a new link and try again.</p>}
            {state.message && <p role="status" className={`rounded-lg px-3 py-2.5 text-sm ${state.success ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"}`}>{state.message}</p>}
            <button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60">
              {pending ? "Please wait…" : content.submit}{!pending && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
          <div className="mt-6 text-sm text-text-muted">
            {mode === "login" && <div className="flex flex-wrap justify-between gap-3"><Link href="/forgot-password" className="hover:text-accent">Forgot password?</Link><span>New here? <Link href="/signup" className="text-accent hover:underline">Create an account</Link></span></div>}
            {mode === "signup" && <p>Already have an account? <Link href="/login" className="text-accent hover:underline">Sign in</Link></p>}
            {mode === "forgot" && <Link href="/login" className="inline-flex items-center gap-1 hover:text-accent"><ArrowLeft className="w-3.5 h-3.5" /> Back to sign in</Link>}
            {mode === "update-password" && <Link href="/login" className="inline-flex items-center gap-1 hover:text-accent"><ArrowLeft className="w-3.5 h-3.5" /> Back to sign in</Link>}
          </div>
          {!process.env.NEXT_PUBLIC_SUPABASE_URL && <p className="mt-4 rounded-lg bg-warning-subtle p-3 text-xs text-warning">Supabase is not configured. Add the environment values from the setup guide to enable accounts.</p>}
          </div>
          <p className="text-center text-xs text-text-muted">A calmer way to work, one task at a time.</p>
        </section>
      </div>
    </main>
  );
}

function Field({ label, name, type, placeholder, icon, autoComplete, required, minLength }: {
  label: string; name: string; type: string; placeholder: string; icon: React.ReactNode; autoComplete?: string; required?: boolean; minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  return <div className="text-sm font-medium text-text-primary">
    <label htmlFor={name}>{label}</label>
    <span className="mt-2 flex items-center gap-3 rounded-lg border border-border bg-surface px-3.5 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/10">
      <span className="text-text-muted">{icon}</span>
      <input id={name} className="min-w-0 flex-1 bg-transparent py-3 text-sm text-text-primary outline-none placeholder:text-text-muted" name={name} type={isPassword && visible ? "text" : type} placeholder={placeholder} autoComplete={autoComplete} required={required} minLength={minLength} />
      {isPassword && <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"} className="rounded p-1 text-text-muted hover:text-text-primary">{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>}
    </span>
  </div>;
}
