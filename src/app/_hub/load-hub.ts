import type { SupabaseClient } from "@supabase/supabase-js";
import { TILES_BUCKET } from "@/app/b/[slug]/tiles";
import {
  type BoardDetail,
  boardDetailFrom,
  type HubBoard,
  hubBoards,
  type TodayCard,
  todayCards,
} from "@/lib/home-hub";
import { listLatestDrawings, loadAccountBoards } from "@/lib/sidebar-boards";
import {
  clockFromRow,
  VENUE_CLOCK_COLUMNS,
  type VenueClockRow,
} from "@/lib/venue-time";

/** Everything the hub shows below its greeting. */
export type HubData = {
  today: TodayCard[];
  boards: HubBoard[];
  /** How many boards the account runs, for the Start card's cap. */
  runs: number;
};

/** As far back as the board statuses read weeks, for an open final. */
const WEEKS_LOOKBACK_MS = 70 * 24 * 60 * 60 * 1000;

type DetailRow = VenueClockRow & {
  id: string;
  weeks: {
    starts_at: string;
    posting_ends_at: string;
    voting_ends_at: string;
    live: { count: number }[];
    peek: { image_path: string }[];
  }[];
};

/**
 * Each board's drawings this week, a peek at the drawings being voted on,
 * when voting closes and which month an open final judges, in one query for
 * every board: the weeks come embedded under their venue, with a live-tile
 * count and the newest three per week.
 */
async function loadBoardDetails(
  admin: SupabaseClient,
  venueIds: string[],
  now: Date,
): Promise<Map<string, BoardDetail>> {
  const details = new Map<string, BoardDetail>();
  if (venueIds.length === 0) return details;

  const since = new Date(now.getTime() - WEEKS_LOOKBACK_MS).toISOString();
  const { data, error } = await admin
    .from("venues")
    .select(
      `id, ${VENUE_CLOCK_COLUMNS}, weeks(starts_at, posting_ends_at, voting_ends_at, live:tiles(count), peek:tiles(image_path))`,
    )
    .in("id", venueIds)
    .gt("weeks.voting_ends_at", since)
    .eq("weeks.live.status", "live")
    .eq("weeks.peek.status", "live")
    .order("created_at", { referencedTable: "weeks.peek", ascending: false })
    .limit(3, { referencedTable: "weeks.peek" })
    .returns<DetailRow[]>();
  if (error) throw new Error(`loadBoardDetails: ${error.message}`);

  const storage = admin.storage.from(TILES_BUCKET);
  for (const row of data) {
    const weeks = row.weeks.map((week) => ({
      startsAt: week.starts_at,
      postingEndsAt: week.posting_ends_at,
      votingEndsAt: week.voting_ends_at,
      liveCount: week.live[0]?.count ?? 0,
      peek: week.peek.map(
        (tile) => storage.getPublicUrl(tile.image_path).data.publicUrl,
      ),
    }));
    details.set(row.id, boardDetailFrom(clockFromRow(row), weeks, now));
  }
  return details;
}

/**
 * The hub for a signed-in account, in three rounds of batched reads however
 * many boards it has: its boards with their statuses (`loadAccountBoards`),
 * then each board's latest drawings and its detail, side by side.
 *
 * A failure in the drawings or the detail only loses the pictures and
 * counts, never the hub;
 * a failure to load the boards themselves throws, for the hub's error
 * boundary.
 *
 * @param admin - A service-role client; `userId` must come from the session.
 */
export async function loadHub(
  admin: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<HubData> {
  const { boards, runs } = await loadAccountBoards(admin, userId, now);
  const ids = boards.map((board) => board.venueId);

  const [latest, details] = await Promise.all([
    listLatestDrawings(admin, ids, 3).catch((error: unknown) => {
      console.error("Could not load the hub's latest drawings", error);
      return new Map<string, string[]>();
    }),
    loadBoardDetails(admin, ids, now).catch((error: unknown) => {
      console.error("Could not load the hub's board details", error);
      return new Map<string, BoardDetail>();
    }),
  ]);

  return {
    today: todayCards(boards, details),
    boards: hubBoards(boards, latest, details),
    runs: runs.length,
  };
}
