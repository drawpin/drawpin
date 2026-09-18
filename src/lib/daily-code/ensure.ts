import type { SupabaseClient } from "@supabase/supabase-js";
import { dayBoundsFor } from "@/lib/venue-time";

/**
 * Today's 8-digit join code for a venue, created on the first ask of the day
 * (ADR-003: on demand, no cron). Customers only learn the code from the owner's
 * screen, so it always exists before anyone types it.
 *
 * @param admin - A service-role client; `daily_codes` has no insert policy.
 */
export async function ensureDailyCode(
  admin: SupabaseClient,
  venue: { id: string; timezone: string },
  now: Date = new Date(),
): Promise<string> {
  const { startsAt, endsAt } = dayBoundsFor(now, venue.timezone);

  // A function rather than a read-then-insert: two first views of /admin
  // arriving together must end up with one code, not two.
  const { data, error } = await admin.rpc("ensure_daily_code", {
    p_venue_id: venue.id,
    p_valid_from: startsAt.toISOString(),
    p_valid_until: endsAt.toISOString(),
  });

  if (error) throw new Error(`ensureDailyCode: ${error.message}`);
  return data;
}
