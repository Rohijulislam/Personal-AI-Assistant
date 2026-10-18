"use client";

import { useActionState } from "react";
import { updateAccount, type AuthActionState } from "@/app/actions/auth";

export function AccountProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(updateAccount, {});
  return <form action={action} className="max-w-2xl space-y-5">
    <label className="block text-sm font-medium text-text-primary">Display name
      <input name="name" defaultValue={name} required minLength={2} autoComplete="name" className="mt-2 w-full rounded-lg border border-border bg-surface px-3.5 py-3 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/10" />
    </label>
    <label className="block text-sm font-medium text-text-primary">Email address
      <input name="email" type="email" defaultValue={email} required autoComplete="email" className="mt-2 w-full rounded-lg border border-border bg-surface px-3.5 py-3 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/10" />
      <span className="mt-1 block text-xs font-normal text-text-muted">Changing your email requires confirming the new address.</span>
    </label>
    {state.message && <p role="status" className={`rounded-lg px-3 py-2.5 text-sm ${state.success ? "bg-accent-subtle text-accent" : "bg-danger-subtle text-danger"}`}>{state.message}</p>}
    <button disabled={pending} className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60">{pending ? "Saving…" : "Save changes"}</button>
  </form>;
}
