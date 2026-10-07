/**
 * Which Late Night boards this device has chosen to see (ADR-012). A Late
 * Night board isn't moderated, so the first visit shows a warning instead of
 * the board; continuing remembers the board in a cookie. A cookie rather than
 * browser storage, so the server knows before it renders and the board never
 * shows for a moment before the warning.
 */

/** Holds the ids of the Late Night boards this device has continued to. */
export const LATE_NIGHT_COOKIE = "drawpin_late_night";

/** A year: long enough that a regular isn't asked again. */
export const LATE_NIGHT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** The most boards remembered; the oldest drop off first. */
export const MAX_REMEMBERED_BOARDS = 30;

const BOARD_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** The board ids in the cookie. Anything that isn't one is ignored. */
export function parseAcceptedBoards(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(".").filter((id) => BOARD_ID.test(id));
}

/** Whether this device has already continued to the board. */
export function hasAcceptedBoard(
  value: string | undefined,
  boardId: string,
): boolean {
  return parseAcceptedBoards(value).includes(boardId);
}

/**
 * The cookie's value once the board is added: newest last, no repeats, and no
 * more than {@link MAX_REMEMBERED_BOARDS}, so it can't grow without bound.
 */
export function acceptBoard(
  value: string | undefined,
  boardId: string,
): string {
  const others = parseAcceptedBoards(value).filter((id) => id !== boardId);
  return [...others, boardId].slice(-MAX_REMEMBERED_BOARDS).join(".");
}
