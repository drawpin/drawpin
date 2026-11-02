/**
 * The boards a signed-out device has opened (ADR-015), kept on the device in
 * a first-party cookie so the server can show them in the sidebar on the
 * first render and merge them into the account at sign-in
 * (`mergeDeviceBoards` in ./my-boards.ts). Not `httpOnly`: it holds nothing
 * secret, so a client component may update it too.
 *
 * The cookie holds board slugs and when each was last opened, nothing else:
 * no account, device or tracking id. Slugs are already public, printed under
 * every QR code.
 *
 * Format, version 1: `v1` then one `.`-separated entry per board, newest
 * first, each `<slug>~<seconds since 1970, base 36>`, e.g.
 * `v1.maple-street-k7m2~t2xk3c.book-club-p9qa~t2wz0a`. Every character is
 * cookie-safe without encoding. A future format bumps the prefix; a value
 * with any other prefix reads as empty, so an old or tampered cookie costs
 * the device its list, never an error.
 */

import {
  boardSlugSchema,
  MAX_LISTED_BOARDS,
  type DeviceBoard,
} from "./my-boards";

export type { DeviceBoard } from "./my-boards";

/** The cookie's name. */
export const DEVICE_BOARDS_COOKIE = "drawpin_boards";

/** A year: a board opened once a term is still there next term. */
export const DEVICE_BOARDS_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const VERSION = "v1";

/**
 * The cookie's boards, newest first. Anything malformed is dropped rather
 * than trusted: unknown version, bad slug, bad time, repeats, or too many.
 */
export function parseDeviceBoards(value: string | undefined): DeviceBoard[] {
  if (!value) return [];
  const [version, ...entries] = value.split(".");
  if (version !== VERSION) return [];

  const seen = new Set<string>();
  const boards: DeviceBoard[] = [];
  for (const entry of entries) {
    const [slug, time, extra] = entry.split("~");
    if (extra !== undefined || !slug || !time) continue;
    if (!boardSlugSchema.safeParse(slug).success || seen.has(slug)) continue;
    if (!/^[0-9a-z]{1,8}$/.test(time)) continue;

    const seconds = parseInt(time, 36);
    const lastVisitedAt = new Date(seconds * 1000);
    if (!Number.isFinite(lastVisitedAt.getTime())) continue;

    seen.add(slug);
    boards.push({ slug, lastVisitedAt });
  }

  return boards
    .sort((a, b) => b.lastVisitedAt.getTime() - a.lastVisitedAt.getTime())
    .slice(0, MAX_LISTED_BOARDS);
}

/** The cookie value for these boards: newest first, at most {@link MAX_LISTED_BOARDS}. */
export function serializeDeviceBoards(boards: DeviceBoard[]): string {
  const entries = boards
    .filter((board) => boardSlugSchema.safeParse(board.slug).success)
    .sort((a, b) => b.lastVisitedAt.getTime() - a.lastVisitedAt.getTime())
    .slice(0, MAX_LISTED_BOARDS)
    .map(
      (board) =>
        `${board.slug}~${Math.max(0, Math.floor(board.lastVisitedAt.getTime() / 1000)).toString(36)}`,
    );
  return [VERSION, ...entries].join(".");
}

/**
 * The cookie value once the device opens `slug`: moved to the front with
 * the new time, and the oldest dropped past {@link MAX_LISTED_BOARDS}.
 */
export function rememberDeviceBoard(
  value: string | undefined,
  slug: string,
  now: Date = new Date(),
): string {
  const others = parseDeviceBoards(value).filter(
    (board) => board.slug !== slug,
  );
  return serializeDeviceBoards([{ slug, lastVisitedAt: now }, ...others]);
}

/** The cookie value without `slug`, for "Remove from my boards" signed out. */
export function forgetDeviceBoard(
  value: string | undefined,
  slug: string,
): string {
  return serializeDeviceBoards(
    parseDeviceBoards(value).filter((board) => board.slug !== slug),
  );
}
