/**
 * Whether what's typed in the rename field would change the board's name,
 * so Save shows only when there's something to save.
 *
 * Compared the way `venueNameSchema` stores a name, trimmed and with runs of
 * whitespace collapsed, so a stray space doesn't count as a change. Kept apart
 * from that file because it brings the moderation code with it, which the
 * browser doesn't need.
 */
export function nameChanged(typed: string, saved: string): boolean {
  return normalize(typed) !== normalize(saved);
}

function normalize(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}
