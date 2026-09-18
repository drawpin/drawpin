import type { SupabaseClient } from "@supabase/supabase-js";
import type { FinalWindow, WeekTiming } from "@/lib/monthly-final";
import { TILES_BUCKET } from "../tiles";

/** A tile in the running for a month's super winner. */
export type Finalist = {
  tileId: string;
  author: string | null;
  caption: string | null;
  imageUrl: string;
  /** Votes it won its own week with, which is why it's here. */
  weekVotes: number;
  isOwn: boolean;
};

/** A month's crowned super winner, for the Hall of Fame. */
export type SuperWinner = {
  month: string;
  author: string | null;
  caption: string | null;
  imageUrl: string;
  voteCount: number;
};

/** The venue's weeks, newest first, for working out its final windows. */
export async function listWeekTimings(
  admin: SupabaseClient,
  venueId: string,
  limit = 30,
): Promise<WeekTiming[]> {
  const { data, error } = await admin
    .from("weeks")
    .select("starts_at, voting_ends_at")
    .eq("venue_id", venueId)
    .order("starts_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Could not load weeks: ${error.message}`);
  return data.map((row) => ({
    startsAt: row.starts_at,
    votingEndsAt: row.voting_ends_at,
  }));
}

/** Finds or creates the venue's final for that month, and returns its id. */
export async function ensureFinal(
  admin: SupabaseClient,
  venueId: string,
  window: FinalWindow,
): Promise<string> {
  const { data, error } = await admin.rpc("ensure_monthly_final", {
    p_venue_id: venueId,
    p_month: window.month,
    p_starts_at: window.startsAt.toISOString(),
    p_ends_at: window.endsAt.toISOString(),
  });

  if (error) throw new Error(`ensureFinal: ${error.message}`);
  return data;
}

type FinalistRow = { tile_id: string; week_votes: number };

type TileRow = {
  id: string;
  user_id: string | null;
  display_name: string | null;
  name_tag: string | null;
  caption: string | null;
  image_path: string;
};

/** The month's finalists, most-voted in their own weeks first. */
export async function listFinalists(
  admin: SupabaseClient,
  finalId: string,
  viewerId: string | null = null,
): Promise<Finalist[]> {
  // The generated types do not know this function returns a set, so the
  // result is cast rather than declared with .returns().
  const { data: rows, error } = await admin.rpc("list_finalists", {
    p_final_id: finalId,
  });

  if (error) throw new Error(`listFinalists: ${error.message}`);
  const data = (rows ?? []) as FinalistRow[];
  if (data.length === 0) return [];

  const { data: tiles, error: tilesError } = await admin
    .from("tiles")
    .select("id, user_id, display_name, name_tag, caption, image_path")
    .in(
      "id",
      data.map((row) => row.tile_id),
    )
    .returns<TileRow[]>();

  if (tilesError) throw new Error(`listFinalists: ${tilesError.message}`);

  const storage = admin.storage.from(TILES_BUCKET);
  const byId = new Map(tiles.map((tile) => [tile.id, tile]));

  // The function's order is the running order, so map over it rather than the
  // tiles, which come back in whatever order the database likes.
  return data.flatMap((row) => {
    const tile = byId.get(row.tile_id);
    if (!tile) return [];

    return [
      {
        tileId: tile.id,
        author:
          tile.display_name && tile.name_tag
            ? `${tile.display_name}#${tile.name_tag}`
            : null,
        caption: tile.caption,
        imageUrl: storage.getPublicUrl(tile.image_path).data.publicUrl,
        weekVotes: row.week_votes,
        isOwn: viewerId !== null && tile.user_id === viewerId,
      },
    ];
  });
}

/** Whether this account has already spent its one vote in the final. */
export async function hasVotedInFinal(
  admin: SupabaseClient,
  finalId: string,
  userId: string,
): Promise<boolean> {
  const { count, error } = await admin
    .from("final_votes")
    .select("id", { count: "exact", head: true })
    .match({ final_id: finalId, user_id: userId });

  if (error) throw new Error(`hasVotedInFinal: ${error.message}`);
  return (count ?? 0) > 0;
}
