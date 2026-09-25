import { createBoardSlug } from "@/lib/slug";

/** The subset of a Postgres error returned by supabase-js that this needs. */
type InsertError = { code: string; message: string };

type VenueRow = {
  owner_id: string;
  name: string;
  slug: string;
  timezone: string;
};

export type InsertVenue = (
  row: VenueRow,
) => Promise<{ error: InsertError | null }>;

const UNIQUE_VIOLATION = "23505";
const MAX_SLUG_ATTEMPTS = 5;

/**
 * Creates the owner's venue, retrying with a fresh slug suffix if the slug is
 * already taken.
 *
 * @returns `"created"`, or `"already-exists"` if this owner already has a
 * venue (one board per owner — e.g. the setup form was submitted twice).
 * @throws {Error} On any other database error, or if no free slug was found.
 */
export async function createVenue(
  input: { ownerId: string; name: string; timezone: string },
  insert: InsertVenue,
  makeSlug: (name: string) => string = createBoardSlug,
): Promise<"created" | "already-exists"> {
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const { error } = await insert({
      owner_id: input.ownerId,
      name: input.name,
      slug: makeSlug(input.name),
      timezone: input.timezone,
    });

    if (!error) return "created";

    if (error.code === UNIQUE_VIOLATION) {
      if (error.message.includes("venues_owner_id_key")) {
        return "already-exists";
      }
      if (error.message.includes("venues_slug_key")) {
        continue;
      }
    }

    throw new Error(`Could not create venue: ${error.message}`);
  }

  throw new Error(
    `Could not find a free board slug after ${MAX_SLUG_ATTEMPTS} attempts`,
  );
}
