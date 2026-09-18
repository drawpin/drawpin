/**
 * Reads the visitor's IP address from the request headers.
 *
 * `x-real-ip` comes first: Vercel's edge sets both headers from the connection
 * it accepted, but `x-forwarded-for` can also carry a chain of proxies, of
 * which only the leftmost entry is the client.
 *
 * @returns The address, or `null` when no proxy set one (e.g. `next dev`).
 */
export function clientIpFrom(headers: Headers): string | null {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;

  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || null;
}
