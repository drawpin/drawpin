import type { SupabaseClient } from "@supabase/supabase-js";
import type { JoinStore } from "./join";

/**
 * {@link JoinStore} backed by Supabase. Needs the service-role client:
 * `daily_codes` is readable only by its owner, and `code_attempts` by nobody
 * (docs/ERD.md, Row level security).
 */
export class SupabaseJoinStore implements JoinStore {
  constructor(private readonly admin: SupabaseClient) {}

  async findVenueByCode(code: string, at: Date): Promise<string | null> {
    const moment = at.toISOString();
    const { data, error } = await this.admin
      .from("daily_codes")
      .select("venues (slug)")
      .eq("code", code)
      .lte("valid_from", moment)
      .gt("valid_until", moment)
      .maybeSingle<{ venues: { slug: string } | null }>();

    if (error) throw new Error(`findVenueByCode: ${error.message}`);
    return data?.venues?.slug ?? null;
  }

  async countWrongGuesses(ipHash: string, windowStart: Date): Promise<number> {
    const { data, error } = await this.admin
      .from("code_attempts")
      .select("attempts")
      .match({ ip_hash: ipHash, window_start: windowStart.toISOString() })
      .maybeSingle();

    if (error) throw new Error(`countWrongGuesses: ${error.message}`);
    return data?.attempts ?? 0;
  }

  async recordWrongGuess(ipHash: string, windowStart: Date): Promise<number> {
    // One statement so simultaneous guesses can't overwrite each other's count.
    const { data, error } = await this.admin.rpc("record_code_attempt", {
      p_ip_hash: ipHash,
      p_window_start: windowStart.toISOString(),
    });

    if (error) throw new Error(`recordWrongGuess: ${error.message}`);
    return data;
  }
}
