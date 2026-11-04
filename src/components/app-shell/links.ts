import { HUB_PATH, LANDING } from "@/lib/landing";

/**
 * Where the sidebar's fixed links go, in one place
 * (docs/design/profiles.md, section 3).
 */

/**
 * Home: the hub. It's `/` while the hub is the landing (signed out, `/`
 * shows the marketing home instead); with `LANDING = "marketing"`, `/` is
 * the marketing home for everyone and the hub is at its own path.
 */
export const HOME_HREF = LANDING === "hub" ? "/" : HUB_PATH;

/** About: the marketing home, at its own address whatever the landing. */
export const ABOUT_HREF = "/about";

/** "All your boards": the hub's full list, past the sidebar's eight. */
export const ALL_BOARDS_HREF = `${HOME_HREF}#boards`;
