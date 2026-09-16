import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

/**
 * Returns the browser's shared Supabase client (anon key, no session), used
 * for Realtime subscriptions on public boards. Shared so a tab opens a single
 * Realtime connection however many components subscribe.
 *
 * @throws {Error} If the public Supabase env vars weren't set at build time.
 */
export function getBrowserClient(): SupabaseClient {
  if (client) return client;

  // Referenced directly so Next inlines them into the client bundle.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set at build time",
    );
  }

  client = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return client;
}
