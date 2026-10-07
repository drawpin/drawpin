import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A board's 8-digit join code, created on the first ask (ADR-003: on demand,
 * no cron). The code is permanent until the owner replaces it (ADR-014), and
 * customers only learn it from the owner, so it always exists before anyone
 * types it.
 *
 * @param admin - A service-role client; `daily_codes` has no insert policy.
 */
export async function ensureJoinCode(
  admin: SupabaseClient,
  venueId: string,
): Promise<string> {
  // A function rather than a read-then-insert: two first views of /admin
  // arriving together must end up with one code, not two.
  const { data, error } = await admin.rpc("ensure_join_code", {
    p_venue_id: venueId,
  });

  if (error) throw new Error(`ensureJoinCode: ${error.message}`);
  return data;
}

/**
 * Gives a board a new join code. The old one stops working at once (ADR-014).
 *
 * @param admin - A service-role client.
 * @returns The new code.
 */
export async function replaceJoinCode(
  admin: SupabaseClient,
  venueId: string,
): Promise<string> {
  const { data, error } = await admin.rpc("replace_join_code", {
    p_venue_id: venueId,
  });

  if (error) throw new Error(`replaceJoinCode: ${error.message}`);
  return data;
}
