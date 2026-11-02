import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_BOARDS_PER_ACCOUNT, type OwnedBoard } from "@/lib/my-boards";
import { TILES_BUCKET } from "@/app/b/[slug]/tiles";

/** How many of a board's newest drawings a run card and the switcher show. */
export const SUMMARY_THUMBNAILS = 3;

/** One board the account runs, with what its card and the switcher show. */
export type BoardSummary = OwnedBoard & {
  /** Live drawings on the week taking posts now. */
  drawingsThisWeek: number;
  isPaused: boolean;
  /** Drawings with reports nobody has dealt with yet, still live. */
  reported: number;
  /** Public URLs of the newest drawings, newest first. */
  thumbnails: string[];
};

/** How many more boards an account running `count` can start. */
export function boardsLeft(count: number): number {
  return Math.max(0, MAX_BOARDS_PER_ACCOUNT - count);
}

/** "1 drawing this week", "14 drawings this week". */
export function drawingsLine(count: number): string {
  return `${count} ${count === 1 ? "drawing" : "drawings"} this week`;
}

/** The Start a board card's line, which says how many more fit. */
export function startCardLine(count: number): string {
  return `Name it, pick its time zone, print the code. You can run ${boardsLeft(count)} more.`;
}

/**
 * Reads what a run card and the switcher show for each board, with the
 * service role (reports aren't readable by the API roles). Boards are looked
 * up side by side; an account runs at most {@link MAX_BOARDS_PER_ACCOUNT}.
 */
export function loadBoardSummaries(
  admin: SupabaseClient,
  boards: OwnedBoard[],
): Promise<BoardSummary[]> {
  return Promise.all(boards.map((board) => summarize(admin, board)));
}

async function summarize(
  admin: SupabaseClient,
  board: OwnedBoard,
): Promise<BoardSummary> {
  const moment = new Date().toISOString();
  const [venue, week, reports] = await Promise.all([
    admin
      .from("venues")
      .select("is_paused")
      .eq("id", board.venueId)
      .maybeSingle<{ is_paused: boolean }>(),
    admin
      .from("weeks")
      .select("id")
      .eq("venue_id", board.venueId)
      .lte("starts_at", moment)
      .gt("posting_ends_at", moment)
      .maybeSingle<{ id: string }>(),
    admin
      .from("tile_reports")
      .select("tile_id, tiles!inner(status, weeks!inner(venue_id))")
      .is("resolved_at", null)
      .eq("tiles.status", "live")
      .eq("tiles.weeks.venue_id", board.venueId)
      .returns<{ tile_id: string }[]>(),
  ]);
  for (const result of [venue, week, reports]) {
    if (result.error) {
      throw new Error(`loadBoardSummaries: ${result.error.message}`);
    }
  }

  let drawingsThisWeek = 0;
  let thumbnails: string[] = [];
  if (week.data) {
    const tiles = await admin
      .from("tiles")
      .select("image_path", { count: "exact" })
      .eq("week_id", week.data.id)
      .eq("status", "live")
      .order("created_at", { ascending: false })
      .limit(SUMMARY_THUMBNAILS)
      .returns<{ image_path: string }[]>();
    if (tiles.error) {
      throw new Error(`loadBoardSummaries: ${tiles.error.message}`);
    }
    drawingsThisWeek = tiles.count ?? 0;
    const storage = admin.storage.from(TILES_BUCKET);
    thumbnails = tiles.data.map(
      (row) => storage.getPublicUrl(row.image_path).data.publicUrl,
    );
  }

  return {
    ...board,
    drawingsThisWeek,
    isPaused: venue.data?.is_paused ?? false,
    // A tile reported twice is still one drawing to look at.
    reported: new Set((reports.data ?? []).map((row) => row.tile_id)).size,
    thumbnails,
  };
}
