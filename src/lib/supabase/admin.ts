import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

/**
 * Creates a Supabase client with the service role key, which bypasses row
 * level security. All writes go through this client (see docs/ERD.md, Row
 * level security), so only call it from server code, after checking who the
 * caller is.
 */
export function createAdminClient() {
  const env = serverEnv();

  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
