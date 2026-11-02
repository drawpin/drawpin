/**
 * Where the sidebar's fixed links go, in one place for the pages still being
 * built on feat/profiles (docs/design/profiles.md, section 3).
 */

/** Home: the hub for a signed-in account, the marketing page otherwise. */
export const HOME_HREF = "/";

/**
 * About: the marketing page. It moves to `/about` when the hub takes over
 * `/` for signed-in accounts; until then `/` is the marketing page.
 */
export const ABOUT_HREF = "/";

/** "All your boards": the hub's full list, past the sidebar's eight. */
export const ALL_BOARDS_HREF = "/#boards";
