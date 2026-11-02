import type { ModerationLevel } from "@/lib/moderation/policy";
import { MAX_BOARDS_PER_ACCOUNT } from "@/lib/my-boards";
import { createBoardSlug } from "@/lib/slug";

/** The subset of a Postgres error returned by supabase-js that this needs. */
type InsertError = { code: string; message: string };

type VenueRow = {
  owner_id: string;
  name: string;
  slug: string;
  timezone: string;
  moderation_level: ModerationLevel;
};

export type InsertVenue = (
  row: VenueRow,
) => Promise<{ error: InsertError | null }>;

export type CreateVenueResult =
  { status: "created"; slug: string } | { status: "limit-reached" };

/** What to tell an account that already runs as many boards as it can. */
export const BOARD_LIMIT_MESSAGE = `You run ${MAX_BOARDS_PER_ACCOUNT} boards, the most an account can. Close one to start another.`;

const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";
const MAX_SLUG_ATTEMPTS = 5;

/**
 * The refusal from `venues_enforce_board_limit` (ADR-016). PostgREST passes
 * on its message but not the constraint name it raises with, and the slug's
 * check constraint is a check violation too, so the message tells them apart.
 */
function isBoardLimit(error: InsertError): boolean {
  return (
    error.code === CHECK_VIOLATION &&
    /can run at most \d+ boards/.test(error.message)
  );
}

/**
 * Creates a board for the owner, retrying with a fresh slug suffix if the
 * slug is already taken.
 *
 * @returns The new board's slug, or `"limit-reached"` if the account already
 * runs {@link MAX_BOARDS_PER_ACCOUNT} boards: the database holds the cap
 * even when a check before this was raced past (e.g. two tabs at once).
 * @throws {Error} On any other database error, or if no free slug was found.
 */
export async function createVenue(
  input: {
    ownerId: string;
    name: string;
    timezone: string;
    moderationLevel: ModerationLevel;
  },
  insert: InsertVenue,
  makeSlug: (name: string) => string = createBoardSlug,
): Promise<CreateVenueResult> {
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const slug = makeSlug(input.name);
    const { error } = await insert({
      owner_id: input.ownerId,
      name: input.name,
      slug,
      timezone: input.timezone,
      moderation_level: input.moderationLevel,
    });

    if (!error) return { status: "created", slug };
    if (isBoardLimit(error)) return { status: "limit-reached" };
    if (
      error.code === UNIQUE_VIOLATION &&
      error.message.includes("venues_slug_key")
    ) {
      continue;
    }

    throw new Error(`Could not create venue: ${error.message}`);
  }

  throw new Error(
    `Could not find a free board slug after ${MAX_SLUG_ATTEMPTS} attempts`,
  );
}
