import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/*
  Supabase client (browser). Used only for the realtime wheel state in this
  build — NOT for auth (identity still comes from the mock sign-in). The anon
  key is safe to ship to the browser; access is governed by RLS (see
  supabase/migrations/0001_canister_state.sql).
*/
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseEnabled) return null;
  if (!client) {
    client = createClient(url as string, anonKey as string, {
      auth: { persistSession: false },
    });
  }
  return client;
}
