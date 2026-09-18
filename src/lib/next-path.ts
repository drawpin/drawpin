/**
 * Keeps a `next=` parameter from sending someone off the site.
 *
 * Sign-in carries the page to come back to through Google and back again,
 * where anyone could edit it. Only a plain path on this site is allowed —
 * `//evil.example` and `https://evil.example` are not.
 *
 * @returns The path, or `fallback` if it isn't one we'd follow.
 */
export function safeNextPath(value: string | null, fallback = "/"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  // A backslash reaches the same places as a slash in some browsers.
  if (value.includes("\\")) return fallback;
  return value;
}
