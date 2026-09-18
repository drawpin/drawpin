/** Votes each account gets on a week's board (docs/PLAN.md, Weekly cycle). */
export const VOTES_PER_WEEK = 3;

/** The week a board is voting on: last week's, during this one. */
export type VotingWeek = { id: string; venueId: string };

/** Why the database refused a vote. Each maps to something a visitor sees. */
export type VoteRejection =
  /** Guest tile, your own tile, removed, or not in this week. */
  | "not-votable"
  /** Voting closed between loading the page and casting. */
  | "closed"
  /** Already voted for that tile, or the limit was reached in a race. */
  | "already-used";

export class VoteRefusedError extends Error {
  constructor(
    readonly rejection: VoteRejection,
    cause: string,
  ) {
    super(`Vote refused (${rejection}): ${cause}`);
    this.name = "VoteRefusedError";
  }
}

/** What casting votes needs from the database. */
export interface VoteStore {
  /** The venue's week that is open for voting right now, if any. */
  findVotingWeek(slug: string): Promise<VotingWeek | null>;
  /** Votes this account has already cast on that week. */
  countVotes(weekId: string, userId: string): Promise<number>;
  /** The tiles it spent them on, so they can't be picked twice. */
  listVotedTileIds(weekId: string, userId: string): Promise<string[]>;
  /**
   * Records the votes.
   *
   * @throws {VoteRefusedError} When the database's rules turn one down.
   */
  insertVotes(weekId: string, userId: string, tileIds: string[]): Promise<void>;
}

export type CastVotesInput = {
  slug: string;
  userId: string;
  tileIds: string[];
};

export type CastVotesFailure =
  | "not-voting"
  | "none-chosen"
  | "no-votes-left"
  | "too-many"
  | "not-votable"
  | "closed"
  | "already-used"
  | "failed";

export type CastVotesResult =
  { ok: true; votesLeft: number } | { ok: false; reason: CastVotesFailure };

/**
 * Casts an account's votes on last week's board.
 *
 * Votes are final and belong to the account rather than the device, so the
 * same person can start on their phone and finish on a laptop with whatever
 * they have left (docs/PLAN.md, Weekly cycle).
 *
 * The checks here are for the visitor's benefit — the database enforces the
 * same rules where they can't be bypassed, and a refusal from it is mapped
 * back to a message rather than thrown away.
 */
export async function castVotes(
  input: CastVotesInput,
  store: VoteStore,
): Promise<CastVotesResult> {
  const tileIds = [...new Set(input.tileIds)];
  if (tileIds.length === 0) return { ok: false, reason: "none-chosen" };

  const week = await store.findVotingWeek(input.slug);
  if (!week) return { ok: false, reason: "not-voting" };

  const used = await store.countVotes(week.id, input.userId);
  const left = VOTES_PER_WEEK - used;
  if (left <= 0) return { ok: false, reason: "no-votes-left" };
  if (tileIds.length > left) return { ok: false, reason: "too-many" };

  try {
    await store.insertVotes(week.id, input.userId, tileIds);
  } catch (error) {
    if (error instanceof VoteRefusedError) {
      return { ok: false, reason: error.rejection };
    }
    throw error;
  }

  return { ok: true, votesLeft: left - tileIds.length };
}
