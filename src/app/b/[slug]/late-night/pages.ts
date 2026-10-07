/**
 * The pages of a board that show its drawings, and so wait behind the Late
 * Night warning, as the path after `/b/<slug>`. The rules page isn't one: the
 * warning links to it.
 */
export const GATED_PAGES = ["", "/vote", "/hall-of-fame", "/final"] as const;

export type GatedPage = (typeof GATED_PAGES)[number];
