/**
 * The custom blocklist half of moderation (docs/PLAN.md, Moderation). It runs
 * before the OpenAI check because it's instant and free.
 *
 * It deliberately holds no slur list: this repository is public, and OpenAI's
 * text moderation already covers hate and harassment. What it catches instead
 * is spam that moderation models don't flag — links, email addresses and phone
 * numbers in a name or caption — plus any extra words the venue owner adds
 * privately through `MODERATION_BLOCKLIST`.
 */

/** Spam patterns that aren't "harmful" but don't belong on a board. */
const SPAM_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "link", pattern: /\b(?:https?:\/\/|www\.)\S+/i },
  // Before the bare-domain rule below, which would otherwise match the domain
  // part of an address and report it as a link.
  { name: "email address", pattern: /\b[^\s@]+@[^\s@]+\.[a-z]{2,}\b/i },
  {
    name: "link",
    pattern:
      /\b[a-z0-9-]+\.(?:com|net|org|io|co|shop|xyz|link|app|dev|me|ru|cn)\b/i,
  },
  // 7+ digits, allowing the spaces, dashes, dots and brackets phone numbers use.
  { name: "phone number", pattern: /(?:\d[\s().-]{0,2}){7,}\d/ },
];

const LEET_REPLACEMENTS: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
};

/**
 * Lowercases, strips accents, and undoes common letter/number swaps, so
 * `Ｂ.A.D`, `bád` and `b4d` all normalize to the same text.
 */
export function normalizeForBlocklist(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[01345 7@$]/g, (char) => LEET_REPLACEMENTS[char] ?? char)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Parses `MODERATION_BLOCKLIST`: a comma-separated list of words or phrases. */
export function parseBlocklist(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((term) => normalizeForBlocklist(term))
    .filter((term) => term.length > 0);
}

export type BlocklistMatch = { term: string };

/**
 * Checks a name or caption against the blocklist.
 *
 * @param text - The text as the visitor typed it.
 * @param blockedTerms - Normalized terms from {@link parseBlocklist}.
 * @returns What matched, or `null` when the text is fine.
 */
export function findBlockedTerm(
  text: string | null,
  blockedTerms: string[],
): BlocklistMatch | null {
  if (!text) return null;

  for (const { name, pattern } of SPAM_PATTERNS) {
    if (pattern.test(text)) return { term: name };
  }

  // Padded so a term at either end still matches on word boundaries.
  const normalized = ` ${normalizeForBlocklist(text)} `;
  for (const term of blockedTerms) {
    if (normalized.includes(` ${term} `)) return { term };
    // Also catch it inside a longer run of letters, e.g. "xxbadwordxx".
    if (term.length >= 4 && normalized.includes(term)) return { term };
  }

  return null;
}
