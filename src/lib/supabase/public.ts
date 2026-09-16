import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

/**
 * Creates a Supabase client with the anon key and no session, for reading
 * public board data on the server. Customers have no accounts, so there are no
 * cookies to forward; row level security limits what it can read.
 */
export function createPublicClient() {
  const env = serverEnv();

  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
