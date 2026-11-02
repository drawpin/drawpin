import type { SupabaseClient } from "@supabase/supabase-js";
import type { BoardStatusStore } from "./board-status";
import { clockFromRow, VENUE_CLOCK_COLUMNS } from "./venue-time";

/** Counts rows per key, for the "how many per week" reads. */
function countBy<T>(rows: T[], key: (row: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = key(row);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

/**
 * {@link BoardStatusStore} backed by Supabase.
 *
 * @param admin - A service-role client: votes, final votes and
 * `account_posts` aren't readable by the API roles. Every query that reads an
 * account's rows filters on the `userId` the caller took from the session.
 */
export function supabaseBoardStatusStore(
  admin: SupabaseClient,
): BoardStatusStore {
  return {
    async listBoards(venueIds) {
      const { data, error } = await admin
        .from("venues")
        .select(`id, is_paused, ${VENUE_CLOCK_COLUMNS}`)
        .in("id", venueIds);
      if (error) throw new Error(`listBoards: ${error.message}`);
      return data.map((row) => ({
        venueId: row.id,
        isPaused: row.is_paused,
        clock: clockFromRow(row),
      }));
    },

    async listWeeks(venueIds, since) {
      const { data, error } = await admin
        .from("weeks")
        .select("id, venue_id, starts_at, posting_ends_at, voting_ends_at")
        .in("venue_id", venueIds)
        .gt("voting_ends_at", since.toISOString());
      if (error) throw new Error(`listWeeks: ${error.message}`);
      return data.map((row) => ({
        id: row.id,
        venueId: row.venue_id,
        startsAt: row.starts_at,
        postingEndsAt: row.posting_ends_at,
        votingEndsAt: row.voting_ends_at,
      }));
    },

    async listPostedDays(userId, venueIds, localDays) {
      if (venueIds.length === 0 || localDays.length === 0) return [];
      const { data, error } = await admin
        .from("account_posts")
        .select("venue_id, local_day")
        .eq("user_id", userId)
        .in("venue_id", venueIds)
        .in("local_day", localDays);
      if (error) throw new Error(`listPostedDays: ${error.message}`);
      return data.map((row) => ({
        venueId: row.venue_id,
        localDay: row.local_day,
      }));
    },

    async countMyVotes(userId, weekIds) {
      if (weekIds.length === 0) return new Map();
      const { data, error } = await admin
        .from("votes")
        .select("week_id")
        .eq("user_id", userId)
        .in("week_id", weekIds);
      if (error) throw new Error(`countMyVotes: ${error.message}`);
      return countBy(data, (row) => row.week_id);
    },

    async countVotableTiles(userId, weekIds) {
      if (weekIds.length === 0) return new Map();
      // Guest tiles aren't in the running (ADR-007), and nobody votes for
      // their own.
      const { data, error } = await admin
        .from("tiles")
        .select("week_id")
        .in("week_id", weekIds)
        .eq("status", "live")
        .not("user_id", "is", null)
        .neq("user_id", userId);
      if (error) throw new Error(`countVotableTiles: ${error.message}`);
      return countBy(data, (row) => row.week_id);
    },

    async listFinals(venueIds, months) {
      const { data, error } = await admin
        .from("monthly_finals")
        .select("id, venue_id, month")
        .in("venue_id", venueIds)
        .in("month", months);
      if (error) throw new Error(`listFinals: ${error.message}`);
      return data.map((row) => ({
        id: row.id,
        venueId: row.venue_id,
        month: row.month,
      }));
    },

    async listFinalsVotedIn(userId, finalIds) {
      if (finalIds.length === 0) return new Set();
      const { data, error } = await admin
        .from("final_votes")
        .select("final_id")
        .eq("user_id", userId)
        .in("final_id", finalIds);
      if (error) throw new Error(`listFinalsVotedIn: ${error.message}`);
      return new Set(data.map((row) => row.final_id));
    },

    async listWeeksWithVotes(weekIds) {
      if (weekIds.length === 0) return new Set();
      const { data, error } = await admin
        .from("votes")
        .select("week_id")
        .in("week_id", weekIds);
      if (error) throw new Error(`listWeeksWithVotes: ${error.message}`);
      return new Set(data.map((row) => row.week_id));
    },

    async listFinalsWithVotes(finalIds) {
      if (finalIds.length === 0) return new Set();
      const { data, error } = await admin
        .from("final_votes")
        .select("final_id")
        .in("final_id", finalIds);
      if (error) throw new Error(`listFinalsWithVotes: ${error.message}`);
      return new Set(data.map((row) => row.final_id));
    },
  };
}
