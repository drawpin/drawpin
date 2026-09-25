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

/** Public participation numbers shown on a board. */
export type BoardStats = {
  /** Distinct people who have drawn on the board (all weeks). */
  people: number;
  /** Live drawings the board still holds (all weeks). */
  totalDrawings: number;
  /** Live drawings in the week that is taking posts now. */
  weekDrawings: number;
};

/**
 * Reads a board's participation stats through the `board_stats` function.
 *
 * The function is `SECURITY DEFINER`: "people" is a distinct count of
 * `tiles.device_id`, which the public role can't read directly, so the count
 * is done inside the database and only the totals come back (never an id).
 *
 * Returns `null` rather than throwing if the stats can't be read: the line is
 * decorative, and a board must still load without it — including in the window
 * between deploying this and applying its migration.
 */
export async function getBoardStats(
  venueId: string,
): Promise<BoardStats | null> {
  const { data, error } = await createPublicClient()
    .rpc("board_stats", { p_venue_id: venueId })
    .single<{
      people: number;
      total_drawings: number;
      week_drawings: number;
    }>();

  if (error) {
    console.error(`Could not load board stats: ${error.message}`);
    return null;
  }

  return {
    people: Number(data.people),
    totalDrawings: Number(data.total_drawings),
    weekDrawings: Number(data.week_drawings),
  };
}

/** The week a board is posting to right now. */
export type PostingWeek = {
  id: string;
  /** When posting closes, so the board can refresh itself at the rollover. */
  postingEndsAt: string;
};

/**
 * Returns the venue's week that is taking posts right now, or `null` if there
 * isn't one yet. Weeks are created when the first tile is posted, so between
 * 4:00 AM Monday and that first post there is none — which is the point: the
 * board shows "no drawings yet" rather than last week's tiles.
 *
 * Selected by time range rather than a stored status, since nothing runs at
 * 4:00 AM to change one (ADR-003).
 */
export async function getPostingWeek(
  venueId: string,
  now: Date = new Date(),
): Promise<PostingWeek | null> {
  const moment = now.toISOString();
  const { data, error } = await createPublicClient()
    .from("weeks")
    .select("id, posting_ends_at")
    .eq("venue_id", venueId)
    .lte("starts_at", moment)
    .gt("posting_ends_at", moment)
    .maybeSingle();

  if (error) throw new Error(`Could not load week: ${error.message}`);
  return data ? { id: data.id, postingEndsAt: data.posting_ends_at } : null;
}

/** The week a board is voting on: the one that has stopped taking posts. */
export type VotingWeek = {
  id: string;
  /** When voting closes, so a screen left open can refresh itself. */
  votingEndsAt: string;
};

/**
 * Returns the venue's week that is open for voting right now — week N during
 * week N+1 — or `null` if there isn't one (docs/PLAN.md, Weekly cycle).
 *
 * Like the posting week, it's selected by the range its timestamps describe
 * rather than a stored status (ADR-003).
 */
export async function getVotingWeek(
  venueId: string,
  now: Date = new Date(),
): Promise<VotingWeek | null> {
  const moment = now.toISOString();
  const { data, error } = await createPublicClient()
    .from("weeks")
    .select("id, voting_ends_at")
    .eq("venue_id", venueId)
    .lte("posting_ends_at", moment)
    .gt("voting_ends_at", moment)
    .maybeSingle();

  if (error) throw new Error(`Could not load voting week: ${error.message}`);
  return data ? { id: data.id, votingEndsAt: data.voting_ends_at } : null;
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
  viewerId: string | null = null,
): Promise<TilePage> {
  let query = supabase
    .from("tiles")
    .select(
      "id, user_id, display_name, name_tag, caption, image_path, created_at",
    )
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
      toTile(
        row,
        (path) => storage.getPublicUrl(path).data.publicUrl,
        viewerId,
      ),
    );

  const last = tiles.at(-1);
  const nextCursor =
    data.length > TILE_PAGE_SIZE && last
      ? { createdAt: last.createdAt, id: last.id }
      : null;

  return { tiles, nextCursor };
}
