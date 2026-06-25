import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/*
  Supabase client (browser). Backs BOTH the realtime wheel state and (now)
  Verve-email auth. The anon key is safe to ship to the browser; data access is
  governed by RLS (see supabase/migrations/0001_canister_state.sql). Auth
  sessions are persisted + auto-refreshed, and we detect the magic-link tokens
  on the return URL so the email sign-in flow completes.
*/
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseEnabled) return null;
  if (!client) {
    client = createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
