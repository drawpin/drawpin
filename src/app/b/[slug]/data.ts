import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import {
  olderThanCursorFilter,
  TILE_PAGE_SIZE,
  TILES_BUCKET,
  type TileCursor,
  type TilePage,
  type TileRow,
  toTile,
} from "./tiles";

// Mirrors the venues.slug check constraint; anything else can't be a board.
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export type Board = {
  id: string;
  name: string;
  timezone: string;
  isPaused: boolean;
};

/**
 * Looks up a venue's board by its public slug. Cached per request so the page
 * and its metadata share one query.
 *
 * @returns The board, or `null` if no venue has this slug.
 */
export const getBoard = cache(async (slug: string): Promise<Board | null> => {
  if (!SLUG_PATTERN.test(slug)) return null;

  const { data, error } = await createPublicClient()
    .from("venues")
    .select("id, name, timezone, is_paused")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`Could not load board: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    timezone: data.timezone,
    isPaused: data.is_paused,
  };
});

/**
 * Returns the id of the venue's week that is currently taking posts, or `null`
 * if there isn't one yet. Weeks are created when the first tile is posted.
 */
export async function getPostingWeekId(
  venueId: string,
): Promise<string | null> {
  const { data, error } = await createPublicClient()
    .from("weeks")
    .select("id")
    .eq("venue_id", venueId)
    .eq("status", "posting")
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Could not load week: ${error.message}`);
  return data?.id ?? null;
}

/**
 * Lists a week's live tiles, newest first, one page at a time.
 *
 * @param cursor - Start after this tile; omit for the first page. Must be
 * validated with `tileCursorSchema`.
 */
export async function listLiveTiles(
  weekId: string,
  cursor?: TileCursor,
  supabase: SupabaseClient = createPublicClient(),
): Promise<TilePage> {
  let query = supabase
    .from("tiles")
    .select("id, display_name, name_tag, caption, image_path, created_at")
    .eq("week_id", weekId)
    .eq("status", "live")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    // One extra row reveals whether another page exists.
    .limit(TILE_PAGE_SIZE + 1);

  if (cursor) query = query.or(olderThanCursorFilter(cursor));

  const { data, error } = await query.returns<TileRow[]>();
  if (error) throw new Error(`Could not load tiles: ${error.message}`);

  const storage = supabase.storage.from(TILES_BUCKET);
  const tiles = data
    .slice(0, TILE_PAGE_SIZE)
    .map((row) =>
      toTile(row, (path) => storage.getPublicUrl(path).data.publicUrl),
    );

  const last = tiles.at(-1);
  const nextCursor =
    data.length > TILE_PAGE_SIZE && last
      ? { createdAt: last.createdAt, id: last.id }
      : null;

  return { tiles, nextCursor };
}
