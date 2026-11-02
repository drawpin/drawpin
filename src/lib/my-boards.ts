import { z } from "zod";

/**
 * The most boards one account can run (ADR-016).
 *
 * Must agree with `v_max` in `venues_enforce_board_limit`
 * (supabase/migrations/20261102120000_several_boards_and_board_visits.sql):
 * the app uses this to hide "Start a board" at the cap, and the database
 * trigger is what holds if a request gets past it. Raise both together.
 */
export const MAX_BOARDS_PER_ACCOUNT = 5;

/** The most boards an account can pin to the top of its list (ADR-015). */
export const MAX_PINNED_BOARDS = 5;

/** The most boards "Your boards" shows, and a device remembers (ADR-015). */
export const MAX_LISTED_BOARDS = 20;

/** Same shape as the `venues.slug` check constraint. */
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 100;

export const boardIdSchema = z.uuid();

export const boardSlugSchema = z
  .string()
  .max(MAX_SLUG_LENGTH)
  .regex(SLUG, "Not a board link");

/** One account's row for one board, joined to the board, as stored. */
export type BoardVisit = {
  venueId: string;
  name: string;
  slug: string;
  lastVisitedAt: string;
  pinnedAt: string | null;
  hiddenAt: string | null;
};

/** A board in the account's "Your boards" list. */
export type MyBoard = {
  venueId: string;
  name: string;
  /** The board's current slug; a rename or link change shows through. */
  slug: string;
  lastVisitedAt: string;
  pinnedAt: string | null;
  /** The account runs this board. */
  isOwner: boolean;
};

/** A board the account runs, for its admin links. */
export type OwnedBoard = { venueId: string; name: string; slug: string };

/** The visits a merge writes: one per board, in the shape the store takes. */
export type VisitWrite = {
  venueId: string;
  lastVisitedAt: string;
  /** `true` to clear `hidden_at`: the board was opened after it was hidden. */
  unhide: boolean;
};

/**
 * What "Your boards" needs from the database. Every method is keyed to the
 * signed-in account's id, which the caller has checked; nothing here takes
 * an account from the request.
 */
export interface MyBoardsStore {
  /** The account's visits that aren't hidden, joined to their boards. */
  listVisits(userId: string, limit: number): Promise<BoardVisit[]>;
  /** One visit, hidden or not, or `null` if the account never opened it. */
  findVisit(userId: string, venueId: string): Promise<BoardVisit | null>;
  /** The account's visits to these boards, hidden or not. */
  listVisitsTo(userId: string, venueIds: string[]): Promise<BoardVisit[]>;
  /** Inserts or updates visits. Leaves `pinned_at` alone. */
  writeVisits(userId: string, visits: VisitWrite[]): Promise<void>;
  countPinned(userId: string): Promise<number>;
  /** @returns Whether the account had a visit to the board to change. */
  setPinned(
    userId: string,
    venueId: string,
    pinnedAt: string | null,
  ): Promise<boolean>;
  /** Hides the board and unpins it. @returns Whether there was a visit. */
  setHidden(
    userId: string,
    venueId: string,
    hiddenAt: string,
  ): Promise<boolean>;
  /** The boards these slugs open today, current or former (ADR-008). */
  resolveSlugs(slugs: string[]): Promise<Map<string, string>>;
  /** The boards the account runs, oldest first. */
  listOwnedBoards(userId: string): Promise<OwnedBoard[]>;
  countOwnedBoards(userId: string): Promise<number>;
}

/**
 * The order "Your boards" shows (ADR-015): hidden boards left out, pinned
 * boards first in the order they were pinned, then the rest, most recently
 * opened first, and no more than {@link MAX_LISTED_BOARDS}.
 */
export function orderMyBoards(
  visits: BoardVisit[],
  ownedIds: ReadonlySet<string>,
): MyBoard[] {
  const byTime = (a: string, b: string) =>
    new Date(a).getTime() - new Date(b).getTime();

  return visits
    .filter((visit) => visit.hiddenAt === null)
    .sort((a, b) => {
      if (a.pinnedAt && b.pinnedAt) return byTime(a.pinnedAt, b.pinnedAt);
      if (a.pinnedAt) return -1;
      if (b.pinnedAt) return 1;
      return byTime(b.lastVisitedAt, a.lastVisitedAt);
    })
    .slice(0, MAX_LISTED_BOARDS)
    .map((visit) => ({
      venueId: visit.venueId,
      name: visit.name,
      slug: visit.slug,
      lastVisitedAt: visit.lastVisitedAt,
      pinnedAt: visit.pinnedAt,
      isOwner: ownedIds.has(visit.venueId),
    }));
}

/**
 * Records that the account opened a board, now. Opening a board the account
 * removed from its list puts it back (ADR-015).
 */
export async function recordVisit(
  userId: string,
  venueId: string,
  store: MyBoardsStore,
  now: Date = new Date(),
): Promise<void> {
  const id = boardIdSchema.parse(venueId);
  await store.writeVisits(userId, [
    { venueId: id, lastVisitedAt: now.toISOString(), unhide: true },
  ]);
}

/** The account's boards for the sidebar and the hub, in {@link orderMyBoards} order. */
export async function listMyBoards(
  userId: string,
  store: MyBoardsStore,
): Promise<MyBoard[]> {
  const [visits, owned] = await Promise.all([
    store.listVisits(userId, MAX_LISTED_BOARDS),
    store.listOwnedBoards(userId),
  ]);
  return orderMyBoards(visits, new Set(owned.map((board) => board.venueId)));
}

export type PinResult =
  "pinned" | "already-pinned" | "limit-reached" | "not-found";

/** What to tell someone who tries to pin a sixth board. */
export const PIN_LIMIT_MESSAGE = `You can pin up to ${MAX_PINNED_BOARDS} boards. Unpin one to pin this.`;

/**
 * Pins a board the account has opened to the top of its list, up to
 * {@link MAX_PINNED_BOARDS}. A board it hid comes back pinned.
 *
 * The limit is checked here rather than in the database: going over it
 * only crowds the account's own list, so two pins racing past it isn't
 * worth a lock.
 */
export async function pinBoard(
  userId: string,
  venueId: string,
  store: MyBoardsStore,
  now: Date = new Date(),
): Promise<PinResult> {
  const id = boardIdSchema.parse(venueId);
  const visit = await store.findVisit(userId, id);
  if (!visit) return "not-found";
  // Hiding unpins, so a pinned board is never hidden too.
  if (visit.pinnedAt) return "already-pinned";

  if ((await store.countPinned(userId)) >= MAX_PINNED_BOARDS) {
    return "limit-reached";
  }

  if (visit.hiddenAt) {
    await store.writeVisits(userId, [
      { venueId: id, lastVisitedAt: visit.lastVisitedAt, unhide: true },
    ]);
  }
  return (await store.setPinned(userId, id, now.toISOString()))
    ? "pinned"
    : "not-found";
}

/** Unpins a board. @returns Whether the account had opened it. */
export async function unpinBoard(
  userId: string,
  venueId: string,
  store: MyBoardsStore,
): Promise<boolean> {
  return store.setPinned(userId, boardIdSchema.parse(venueId), null);
}

/**
 * "Remove from my boards": hides the board, and unpins it, until the
 * account opens it again. @returns Whether the account had opened it.
 */
export async function hideBoard(
  userId: string,
  venueId: string,
  store: MyBoardsStore,
  now: Date = new Date(),
): Promise<boolean> {
  return store.setHidden(
    userId,
    boardIdSchema.parse(venueId),
    now.toISOString(),
  );
}

/** A board remembered on a signed-out device. */
export type DeviceBoard = { slug: string; lastVisitedAt: Date };

/**
 * Works out the visits a device's list adds to an account. Slugs are
 * resolved to boards first (a former slug counts as its board); a board
 * named twice keeps its latest visit. A visit the account already has is
 * moved forward only, never back, and a board the account hid comes back
 * only if the device opened it after it was hidden.
 */
export function planMerge(
  deviceBoards: DeviceBoard[],
  boardIdsBySlug: ReadonlyMap<string, string>,
  existing: BoardVisit[],
): VisitWrite[] {
  const latest = new Map<string, number>();
  for (const entry of deviceBoards) {
    const venueId = boardIdsBySlug.get(entry.slug);
    if (!venueId) continue;
    const at = entry.lastVisitedAt.getTime();
    latest.set(venueId, Math.max(at, latest.get(venueId) ?? -Infinity));
  }

  const current = new Map(existing.map((visit) => [visit.venueId, visit]));
  const writes: VisitWrite[] = [];
  for (const [venueId, at] of latest) {
    const visit = current.get(venueId);
    if (!visit) {
      writes.push({
        venueId,
        lastVisitedAt: new Date(at).toISOString(),
        unhide: true,
      });
      continue;
    }

    const known = new Date(visit.lastVisitedAt).getTime();
    if (at <= known) continue;
    const hiddenAt = visit.hiddenAt ? new Date(visit.hiddenAt).getTime() : null;
    writes.push({
      venueId,
      lastVisitedAt: new Date(at).toISOString(),
      unhide: hiddenAt === null || at > hiddenAt,
    });
  }
  return writes;
}

/**
 * Adds the boards a device remembered while signed out to the account it
 * signs in to (ADR-015). Slugs no board has any more, current or former,
 * are dropped.
 *
 * @returns How many boards were added or moved up.
 */
export async function mergeDeviceBoards(
  userId: string,
  deviceBoards: DeviceBoard[],
  store: MyBoardsStore,
): Promise<number> {
  const entries = deviceBoards
    .filter((entry) => boardSlugSchema.safeParse(entry.slug).success)
    .slice(0, MAX_LISTED_BOARDS);
  if (entries.length === 0) return 0;

  const boardIdsBySlug = await store.resolveSlugs([
    ...new Set(entries.map((entry) => entry.slug)),
  ]);
  if (boardIdsBySlug.size === 0) return 0;

  const existing = await store.listVisitsTo(userId, [
    ...new Set(boardIdsBySlug.values()),
  ]);
  const writes = planMerge(entries, boardIdsBySlug, existing);
  if (writes.length > 0) await store.writeVisits(userId, writes);
  return writes.length;
}

/** The boards the account runs, oldest first, for the sidebar and `/admin`. */
export function listOwnedBoards(
  userId: string,
  store: MyBoardsStore,
): Promise<OwnedBoard[]> {
  return store.listOwnedBoards(userId);
}

/** How many boards the account runs, to compare with {@link MAX_BOARDS_PER_ACCOUNT}. */
export function ownedBoardCount(
  userId: string,
  store: MyBoardsStore,
): Promise<number> {
  return store.countOwnedBoards(userId);
}
