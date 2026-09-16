const MAX_BASE_LENGTH = 40;
const SUFFIX_LENGTH = 4;

// The slug ends up printed under a QR code, so leave out characters that are
// easy to misread when typed by hand: 0/o, 1/l/i.
const SUFFIX_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/**
 * Turns a venue name into the readable part of a board slug: lowercase ASCII
 * letters and digits separated by single hyphens.
 *
 * @example slugifyVenueName("Café Olé & Co.") // "cafe-ole-co"
 * @returns The slug base, or `"board"` if the name has no usable characters.
 */
export function slugifyVenueName(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_BASE_LENGTH)
    .replace(/-+$/, "");

  return base || "board";
}

/**
 * Builds a public board slug from a venue name plus a random suffix, e.g.
 * `blue-bottle-k7m2`. The suffix keeps same-named venues apart and makes board
 * URLs unguessable.
 *
 * @param name - The venue name.
 * @param fillRandom - Source of randomness; injectable for tests.
 * @returns A slug matching the `venues.slug` check constraint.
 */
export function createBoardSlug(
  name: string,
  fillRandom: (bytes: Uint8Array) => Uint8Array = (bytes) =>
    crypto.getRandomValues(bytes),
): string {
  const bytes = fillRandom(new Uint8Array(SUFFIX_LENGTH));
  const suffix = Array.from(
    bytes,
    (byte) => SUFFIX_ALPHABET[byte % SUFFIX_ALPHABET.length],
  ).join("");

  return `${slugifyVenueName(name)}-${suffix}`;
}
