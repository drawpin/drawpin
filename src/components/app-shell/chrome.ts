/**
 * How much of the app shell a page gets (docs/design/profiles.md, section 2):
 *
 * - `"full"`: the sidebar column on a laptop, the drawer on a phone.
 * - `"button-only"`: no column and no swipe; the page's own menu button is
 *   the only way into the drawer. The draw step, so nothing competes with
 *   the canvas.
 * - `"none"`: no shell at all. The print view, which is a sheet of paper.
 */
export type Chrome = "full" | "button-only" | "none";

/** `/b/<slug>` and everything under it, capturing the slug. */
const BOARD_PATH = /^\/b\/([^/]+)(\/.*)?$/;

/**
 * The shell for a path. Decided from the path, not passed by each page: the
 * shell lives in the root layout, which stays mounted across client-side
 * navigation, so only the current path (read on the client) is ever up to
 * date.
 */
export function chromeForPath(pathname: string): Chrome {
  // A board's print view (ADR-016). Not `/admin/print`: that's the owner
  // screen of a board whose slug is "print".
  if (/^\/admin\/[^/]+\/print\/?$/.test(pathname)) return "none";
  if (/^\/b\/[^/]+\/draw\/?$/.test(pathname)) return "button-only";
  return "full";
}

/**
 * The board slug a path is on, for remembering the visit and marking the
 * board's row as current; `null` off a board.
 */
export function boardSlugFromPath(pathname: string): string | null {
  const match = BOARD_PATH.exec(pathname);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}
