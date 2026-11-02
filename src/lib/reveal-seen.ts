/**
 * Whether this browser has watched a result's reveal (the podium that plays
 * once on the board). Kept on the device, in localStorage, so it works for
 * guests too; the sidebar reads the same keys to know whether "Results are
 * in" is still news.
 */

const key = (revealId: string) => `drawpin:reveal:${revealId}`;

/** Whether this device has seen a result. Storage can be unavailable. */
export function hasSeenReveal(revealId: string): boolean {
  try {
    return localStorage.getItem(key(revealId)) === "1";
  } catch {
    return false;
  }
}

/** Marks a result as seen on this device. */
export function markRevealSeen(revealId: string): void {
  try {
    localStorage.setItem(key(revealId), "1");
  } catch {
    // Without storage it simply plays again next visit.
  }
}
