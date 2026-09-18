import type { SupabaseClient } from "@supabase/supabase-js";
import { TILES_BUCKET } from "../tiles";

/** A week's winning tile, as the Hall of Fame shows it. */
export type Winner = {
  weekId: string;
  /** The Monday the winning week began, for the heading. */
  weekStartsAt: string;
  author: string | null;
  caption: string | null;
  imageUrl: string;
  voteCount: number;
};

type WinnerRow = {
  week_id: string;
  vote_count: number;
  weeks: { starts_at: string } | null;
  tiles: {
    display_name: string | null;
    name_tag: string | null;
    caption: string | null;
    image_path: string;
  } | null;
};

/**
 * A venue's weekly winners, newest first.
 *
 * Brings the Hall of Fame up to date first: winners are crowned the first time
 * someone asks for them rather than by a job (ADR-003), and a week whose
 * winning tile the owner has since removed is re-crowned from what's left.
 *
 * @param admin - A service-role client; crowning writes, and `hall_of_fame`
 * has no insert policy.
 */
export async function listWinners(
  admin: SupabaseClient,
  venueId: string,
  limit = 20,
): Promise<Winner[]> {
  const { error: finalizeError } = await admin.rpc("finalize_venue_winners", {
    p_venue_id: venueId,
  });
  if (finalizeError) {
    throw new Error(`Could not finalize winners: ${finalizeError.message}`);
  }

  const { data, error } = await admin
    .from("hall_of_fame")
    .select(
      "week_id, vote_count, weeks (starts_at), tiles (display_name, name_tag, caption, image_path)",
    )
    .eq("venue_id", venueId)
    // Ordered below rather than here: PostgREST can order the embedded weeks
    // among themselves, but not the winners by the week they belong to. A
    // venue collects about one row a week, so this stays small.
    .returns<WinnerRow[]>();

  if (error) throw new Error(`Could not load winners: ${error.message}`);

  const storage = admin.storage.from(TILES_BUCKET);
  return data
    .filter((row) => row.tiles !== null && row.weeks !== null)
    .map((row) => ({
      weekId: row.week_id,
      weekStartsAt: row.weeks!.starts_at,
      author:
        row.tiles!.display_name && row.tiles!.name_tag
          ? `${row.tiles!.display_name}#${row.tiles!.name_tag}`
          : null,
      caption: row.tiles!.caption,
      imageUrl: storage.getPublicUrl(row.tiles!.image_path).data.publicUrl,
      voteCount: row.vote_count,
    }))
    .sort((a, b) => b.weekStartsAt.localeCompare(a.weekStartsAt))
    .slice(0, limit);
}
