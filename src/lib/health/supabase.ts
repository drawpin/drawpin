import type { SupabaseClient } from "@supabase/supabase-js";
import { TILES_BUCKET } from "@/app/b/[slug]/tiles";

/**
 * Checks the database answers.
 *
 * Deliberately the cheapest query that proves a round trip: no rows, just a
 * count against a table that always exists. A paused Supabase project (issue
 * #62) fails here, which is the point.
 *
 * @returns `null` when it answered, or what went wrong.
 */
export async function checkDatabase(
  admin: SupabaseClient,
): Promise<string | null> {
  const { error } = await admin
    .from("venues")
    .select("id", { head: true, count: "exact" })
    .limit(1);

  return error ? error.message : null;
}

/**
 * Checks storage answers, since a board with no images is as broken as a
 * board with no database.
 *
 * @returns `null` when it answered, or what went wrong.
 */
export async function checkStorage(
  admin: SupabaseClient,
): Promise<string | null> {
  const { error } = await admin.storage
    .from(TILES_BUCKET)
    .list("", { limit: 1 });

  return error ? error.message : null;
}
