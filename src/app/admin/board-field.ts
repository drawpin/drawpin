// Shared by the owner screen's client forms and its Server Actions, which
// can't export constants of their own ("use server").

/** The form field every owner action reads its board from (ADR-016). */
export const BOARD_ID_FIELD = "boardId";

/**
 * The query a link change adds to the owner screen it lands on: the screen
 * moves to the new slug, so the form that asked can't say it worked.
 */
export const LINK_CHANGED_PARAM = "link";

/** The owner screen of a board, or one of its pages, e.g. `"/print"`. */
export function adminPath(slug: string, page = ""): string {
  return `/admin/${slug}${page}`;
}
