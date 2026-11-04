import { safeNextPath } from "@/lib/next-path";

/**
 * Where the universal sign-in sends someone, and how pages send them to it
 * (ADR-015, docs/design/profiles.md section 6). Pure, so it's tested
 * without a browser or a database.
 */

/**
 * The owner screens. An account that only runs a board (it came in through
 * "Start a board") may reach them without picking a drawing name, as before
 * ADR-013; everywhere else a name is needed first.
 */
function isOwnerPath(path: string): boolean {
  return /^\/(admin|setup)(?:[/?#]|$)/.test(path);
}

/**
 * Where a freshly signed-in account goes.
 *
 * @param next - The page they asked to come back to, as received. Anything
 *   that isn't a plain path on this site is replaced with `fallback`.
 * @param hasProfile - Whether the account has picked a drawing name.
 * @param fallback - Where to go when `next` is missing or refused.
 * @returns The path to redirect to: `next`, or `/welcome` carrying it when
 *   the account still has to pick a name.
 */
export function signInDestination({
  next,
  hasProfile,
  fallback = "/",
}: {
  next: string | null | undefined;
  hasProfile: boolean;
  fallback?: string;
}): string {
  const destination = safeNextPath(next ?? null, fallback);
  if (hasProfile || isOwnerPath(destination)) return destination;
  return `/welcome?next=${encodeURIComponent(destination)}`;
}

/**
 * The link to the full-page sign-in, returning to `next` afterwards. A
 * `next` that isn't a plain path on this site is dropped.
 */
export function loginHref(next?: string | null): string {
  const safe = safeNextPath(next ?? null, "");
  return safe ? `/login?next=${encodeURIComponent(safe)}` : "/login";
}
