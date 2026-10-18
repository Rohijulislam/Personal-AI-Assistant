"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export type AuthActionState = { message?: string; success?: boolean };

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function signIn(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return { message: "Add the Supabase URL and publishable key to .env.local to enable accounts." };
  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!validEmail(email) || !password) return { message: "Enter a valid email and password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { message: "Email or password is incorrect. Try again or reset your password." };
  const next = text(formData, "next");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

export async function signUp(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return { message: "Add the Supabase URL and publishable key to .env.local to enable accounts." };
  const name = text(formData, "name");
  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (name.length < 2) return { message: "Enter your name (at least 2 characters)." };
  if (!validEmail(email)) return { message: "Enter a valid email address." };
  if (password.length < 8) return { message: "Use a password with at least 8 characters." };
  const supabase = await createClient();
  const requestHeaders = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${requestHeaders.get("x-forwarded-proto") ?? "http"}://${requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")}`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: name },
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });
  if (error) return { message: error.message };
  if (data.session) redirect("/dashboard");
  return { success: true, message: "Check your inbox for a confirmation link to finish creating your account." };
}

export async function requestPasswordReset(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return { message: "Add the Supabase URL and publishable key to .env.local to enable account recovery." };
  const email = text(formData, "email").toLowerCase();
  if (!validEmail(email)) return { message: "Enter a valid email address." };
  const supabase = await createClient();
  const requestHeaders = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${requestHeaders.get("x-forwarded-proto") ?? "http"}://${requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")}`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/account/update-password`,
  });
  if (error) return { message: error.message };
  return { success: true, message: "If an account exists for that address, a password reset link is on its way." };
}

export async function updatePassword(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return { message: "Supabase is not configured." };
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  if (password.length < 8) return { message: "Use a password with at least 8 characters." };
  if (password !== confirmation) return { message: "The passwords do not match." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { message: "Your reset link is invalid or expired. Request another one." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { message: error.message };
  redirect("/account?password-updated=1");
}

export async function updateAccount(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return { message: "Supabase is not configured." };
  const name = text(formData, "name");
  const email = text(formData, "email").toLowerCase();
  if (name.length < 2) return { message: "Enter your name (at least 2 characters)." };
  if (!validEmail(email)) return { message: "Enter a valid email address." };
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { message: "Sign in again to update your account." };
  const emailChanged = email !== user.email;
  const { error } = await supabase.auth.updateUser({
    email: emailChanged ? email : undefined,
    data: { ...user.user_metadata, display_name: name },
  });
  if (error) return { message: error.message };
  return {
    success: true,
    message: emailChanged
      ? "Profile saved. Confirm the email change using the link sent to your new address."
      : "Your profile has been updated.",
  };
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
