/**
 * Reads the visitor's IP address from the request headers.
 *
 * `x-real-ip` comes first: Vercel's edge sets both headers from the connection
 * it accepted, but `x-forwarded-for` can also carry a chain of proxies, of
 * which only the leftmost entry is the client.
 *
 * This trusts those headers, which is safe *only* because Vercel's edge sets
 * them from the real connection and overwrites anything the client sent. If the
 * app were ever served without that proxy in front, both would be spoofable —
 * and the IP is used for the short burst throttle and a stored hash, never as a
 * one-post-per-IP limit, so a spoof would only loosen the burst window.
 *
 * @returns The address, or `null` when no proxy set one (e.g. `next dev`).
 */
export function clientIpFrom(headers: Headers): string | null {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;

  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || null;
}
