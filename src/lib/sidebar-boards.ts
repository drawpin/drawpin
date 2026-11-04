/**
 * The boards a person sees in the sidebar and on the home hub (ADR-015),
 * with what each needs to draw its row or card: name, latest drawing, status
 * and pin. Signed in, they come from the account (`board_visits`); signed
 * out, from the device's `drawpin_boards` cookie.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { TILES_BUCKET } from "@/app/b/[slug]/tiles";
import { type BoardStatus, loadBoardStatuses, NO_STATUS } from "./board-status";
import { parseDeviceBoards } from "./device-boards";
import { MAX_LISTED_BOARDS, type OwnedBoard, orderMyBoards } from "./my-boards";
import { supabaseBoardStatusStore } from "./supabase-board-status";
import { supabaseMyBoardsStore } from "./supabase-my-boards";

/** A board in the sidebar or on the hub. */
export type SidebarBoard = {
  venueId: string;
  slug: string;
  name: string;
  /** The board's newest live drawing, or `null` before its first. */
  latestImageUrl: string | null;
  status: BoardStatus;
  /** Votes left, when `status` is "vote". */
  votesLeft?: number;
  /** Results to reveal (see `BoardStatusInfo.revealIds`). */
  revealIds: string[];
  /** When it was pinned, or `null`. Always `null` signed out. */
  pinnedAt: string | null;
  /** The account runs this board. */
  owned: boolean;
  lastVisitedAt: string;
};

type LatestRow = {
  id: string;
  weeks: { tiles: { image_path: string }[] }[];
};

/**
 * Each board's newest live drawings, newest first, in one query: PostgREST
 * limits embedded rows per parent, so each board brings its own two latest
 * weeks and their newest `perBoard` tiles. Two weeks, because a new week has
 * no drawings until its first post.
 *
 * @returns Image URLs by venue id; a board with none is missing.
 */
export async function listLatestDrawings(
  client: SupabaseClient,
  venueIds: string[],
  perBoard: number,
): Promise<Map<string, string[]>> {
  const latest = new Map<string, string[]>();
  if (venueIds.length === 0) return latest;

  const { data, error } = await client
    .from("venues")
    .select("id, weeks(tiles(image_path))")
    .in("id", venueIds)
    .eq("weeks.tiles.status", "live")
    .order("starts_at", { referencedTable: "weeks", ascending: false })
    .limit(2, { referencedTable: "weeks" })
    .order("created_at", { referencedTable: "weeks.tiles", ascending: false })
    .limit(perBoard, { referencedTable: "weeks.tiles" })
    .returns<LatestRow[]>();
  if (error) throw new Error(`listLatestDrawings: ${error.message}`);

  const storage = client.storage.from(TILES_BUCKET);
  for (const row of data) {
    const urls = row.weeks
      .flatMap((week) => week.tiles)
      .slice(0, perBoard)
      .map((tile) => storage.getPublicUrl(tile.image_path).data.publicUrl);
    if (urls.length > 0) latest.set(row.id, urls);
  }
  return latest;
}

/**
 * The signed-in account's boards, pinned first then by last visit, with
 * their statuses and latest drawings, and the boards it runs.
 *
 * @param admin - A service-role client; `userId` must come from the session.
 */
export async function loadAccountBoards(
  admin: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<{ boards: SidebarBoard[]; runs: OwnedBoard[] }> {
  const store = supabaseMyBoardsStore(admin);
  const [visits, runs] = await Promise.all([
    store.listVisits(userId, MAX_LISTED_BOARDS),
    store.listOwnedBoards(userId),
  ]);
  const mine = orderMyBoards(
    visits,
    new Set(runs.map((board) => board.venueId)),
  );
  const ids = mine.map((board) => board.venueId);

  const [statuses, latest] = await Promise.all([
    loadBoardStatuses(userId, ids, supabaseBoardStatusStore(admin), now),
    listLatestDrawings(admin, ids, 1),
  ]);

  const boards = mine.map((board) => {
    const status = statuses.get(board.venueId) ?? NO_STATUS;
    return {
      venueId: board.venueId,
      slug: board.slug,
      name: board.name,
      latestImageUrl: latest.get(board.venueId)?.[0] ?? null,
      status: status.status,
      votesLeft: status.votesLeft,
      revealIds: status.revealIds,
      pinnedAt: board.pinnedAt,
      owned: board.isOwner,
      lastVisitedAt: board.lastVisitedAt,
    };
  });
  return { boards, runs };
}

/**
 * The boards a signed-out device remembers, newest first. Slugs no board has
 * any more are dropped; a former slug shows as its board today, and a board
 * named twice keeps its latest visit.
 *
 * @param cookieValue - The `drawpin_boards` cookie, untrusted.
 */
export async function loadDeviceBoards(
  admin: SupabaseClient,
  cookieValue: string | undefined,
): Promise<SidebarBoard[]> {
  const entries = parseDeviceBoards(cookieValue);
  if (entries.length === 0) return [];

  const idsBySlug = await supabaseMyBoardsStore(admin).resolveSlugs(
    entries.map((entry) => entry.slug),
  );
  const visits = new Map<string, Date>();
  for (const entry of entries) {
    const venueId = idsBySlug.get(entry.slug);
    if (venueId && !visits.has(venueId)) {
      // Entries are newest first, so the first one per board is its latest.
      visits.set(venueId, entry.lastVisitedAt);
    }
  }
  const ids = [...visits.keys()];
  if (ids.length === 0) return [];

  const [venues, latest] = await Promise.all([
    admin.from("venues").select("id, name, slug").in("id", ids),
    listLatestDrawings(admin, ids, 1),
  ]);
  if (venues.error) {
    throw new Error(`loadDeviceBoards: ${venues.error.message}`);
  }
  const byId = new Map(venues.data.map((row) => [row.id, row]));

  return ids.flatMap((venueId) => {
    const venue = byId.get(venueId);
    if (!venue) return [];
    return [
      {
        venueId,
        slug: venue.slug,
        name: venue.name,
        latestImageUrl: latest.get(venueId)?.[0] ?? null,
        status: null,
        revealIds: [],
        pinnedAt: null,
        owned: false,
        lastVisitedAt: visits.get(venueId)!.toISOString(),
      },
    ];
  });
}
