import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type VoteRejection,
  VoteRefusedError,
  type VoteStore,
  type VotingWeek,
} from "./cast-votes";

const UNIQUE_VIOLATION = "23505";

/**
 * Works out which rule the database turned a vote down for.
 *
 * The trigger raises plain exceptions, so the message is all there is; each
 * one is matched here and nowhere else (`20260918040000_account_voting.sql`).
 */
function rejectionFor(message: string): VoteRejection {
  if (message.includes("already used its 3 votes")) return "already-used";
  if (message.includes("voting has closed")) return "closed";
  if (message.includes("still taking posts")) return "closed";
  return "not-votable";
}

/**
 * {@link VoteStore} backed by Supabase. Needs the service-role client: nobody
 * else may read or write `votes`, since live counts stay hidden until voting
 * closes (docs/ERD.md, Row level security).
 */
export class SupabaseVoteStore implements VoteStore {
  constructor(
    private readonly admin: SupabaseClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async findVotingWeek(slug: string): Promise<VotingWeek | null> {
    const moment = this.now().toISOString();
    const { data, error } = await this.admin
      .from("weeks")
      .select("id, venue_id, venues!inner(slug)")
      .eq("venues.slug", slug)
      .lte("posting_ends_at", moment)
      .gt("voting_ends_at", moment)
      .maybeSingle();

    if (error) throw new Error(`findVotingWeek: ${error.message}`);
    return data ? { id: data.id, venueId: data.venue_id } : null;
  }

  async countVotes(weekId: string, userId: string): Promise<number> {
    const { count, error } = await this.admin
      .from("votes")
      .select("id", { count: "exact", head: true })
      .match({ week_id: weekId, user_id: userId });

    if (error) throw new Error(`countVotes: ${error.message}`);
    return count ?? 0;
  }

  async listVotedTileIds(weekId: string, userId: string): Promise<string[]> {
    const { data, error } = await this.admin
      .from("votes")
      .select("tile_id")
      .match({ week_id: weekId, user_id: userId });

    if (error) throw new Error(`listVotedTileIds: ${error.message}`);
    return data.map((row) => row.tile_id);
  }

  async insertVotes(
    weekId: string,
    userId: string,
    tileIds: string[],
  ): Promise<void> {
    // One statement, so the votes land together or not at all: the trigger
    // counts what's already there, and a half-applied batch would leave
    // someone's remaining votes wrong.
    const { error } = await this.admin.from("votes").insert(
      tileIds.map((tileId) => ({
        week_id: weekId,
        user_id: userId,
        tile_id: tileId,
      })),
    );

    if (!error) return;
    if (error.code === UNIQUE_VIOLATION) {
      throw new VoteRefusedError("already-used", error.message);
    }
    throw new VoteRefusedError(rejectionFor(error.message), error.message);
  }
}
