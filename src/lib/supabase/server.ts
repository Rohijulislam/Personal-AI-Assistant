import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicKey, isSupabaseConfigured } from "./client";

export async function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Add the public URL and publishable key.");
  }
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabasePublicKey()!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot write cookies; proxy.ts refreshes them.
          }
        },
      },
    },
  );
}
