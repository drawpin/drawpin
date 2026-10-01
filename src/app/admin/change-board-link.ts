import { createBoardSlug } from "@/lib/slug";

/** The subset of a Postgres error returned by supabase-js that this needs. */
type RpcError = { code: string; message: string };

/** Moves the owner's venue to `slug`, keeping its old one as a redirect. */
export type MoveVenueSlug = (
  slug: string,
) => Promise<{ error: RpcError | null }>;

const UNIQUE_VIOLATION = "23505";
const MAX_SLUG_ATTEMPTS = 5;

/**
 * Gives a board a new link built from its current name, the way setup builds
 * the first one, retrying with a fresh suffix if that slug is or was another
 * board's. The old slug keeps working as a redirect (ADR-008).
 *
 * @returns The board's new slug.
 * @throws {Error} On any other database error, or if no free slug was found.
 */
export async function changeBoardLink(
  name: string,
  move: MoveVenueSlug,
  makeSlug: (name: string) => string = createBoardSlug,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const slug = makeSlug(name);
    const { error } = await move(slug);

    if (!error) return slug;
    if (
      error.code === UNIQUE_VIOLATION &&
      error.message.includes("venues_slug_key")
    ) {
      continue;
    }

    throw new Error(`Could not change the board link: ${error.message}`);
  }

  throw new Error(
    `Could not find a free board slug after ${MAX_SLUG_ATTEMPTS} attempts`,
  );
}
