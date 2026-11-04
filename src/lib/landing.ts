/**
 * What `/` shows (ADR-015; docs/design/profiles.md, section 3).
 *
 * - `"hub"`: a signed-in account with a name lands on the home hub, its
 *   boards and what's waiting on them. Everyone else gets the marketing
 *   home.
 * - `"marketing"`: everyone gets the marketing home at `/`, and the hub
 *   moves to {@link HUB_PATH}, where the sidebar's "Home" goes.
 *
 * The marketing home is at `/about` either way, so a signed-in person can
 * still show a friend what DrawPin is. The owner flips this at review.
 */
export type Landing = "hub" | "marketing";

export const LANDING: Landing = "hub";

/** Where the hub lives when `/` is the marketing home for everyone. */
export const HUB_PATH = "/home";

/** Who is opening `/`, as far as the landing cares. */
export type LandingViewer = {
  signedIn: boolean;
  /** The account has picked its name, so the hub can greet it. */
  hasUsername: boolean;
};

/**
 * Which page `/` renders. Signed in counts as returning: signing in at all
 * means the person has been here before, and an account with no boards yet
 * gets the hub's empty state (join with a code, Start a board) rather than
 * the poster again. An account that hasn't picked a name yet gets the
 * marketing home, since the hub has nobody to greet.
 */
export function landingFor(
  viewer: LandingViewer,
  landing: Landing = LANDING,
): Landing {
  if (landing === "marketing") return "marketing";
  return viewer.signedIn && viewer.hasUsername ? "hub" : "marketing";
}
