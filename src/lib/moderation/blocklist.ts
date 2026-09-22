/**
 * The custom blocklist half of moderation (docs/PLAN.md, Moderation). It runs
 * before the OpenAI check because it's instant and free.
 *
 * It holds no slur list of its own — this repository is public. What it
 * matches here is spam that moderation models don't flag (links, email
 * addresses and phone numbers) plus whatever terms are handed to it: the
 * built-in hate-term list from `hate-terms.ts` (OpenAI's text moderation has
 * a documented blind spot on slurs and contextual hate speech) and any extra
 * words a venue owner adds privately through `MODERATION_BLOCKLIST`.
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
 * A term to block, either a plain normalized word/phrase (from
 * {@link parseBlocklist}) or one with known-innocent phrases it shouldn't
 * trip inside (from `hate-terms.ts`) — e.g. the term `arse` exempting
 * `sparse`.
 */
export type BlockedTerm =
  string | { term: string; exceptions?: readonly string[] };

/**
 * Checks a name or caption against the blocklist.
 *
 * @param text - The text as the visitor typed it.
 * @param blockedTerms - Terms to match, normalized (see {@link BlockedTerm}).
 * @returns What matched, or `null` when the text is fine.
 */
export function findBlockedTerm(
  text: string | null,
  blockedTerms: BlockedTerm[],
): BlocklistMatch | null {
  if (!text) return null;

  for (const { name, pattern } of SPAM_PATTERNS) {
    if (pattern.test(text)) return { term: name };
  }

  // Padded so a term at either end still matches on word boundaries.
  const normalized = ` ${normalizeForBlocklist(text)} `;
  for (const entry of blockedTerms) {
    const term = typeof entry === "string" ? entry : entry.term;
    const exceptions = typeof entry === "string" ? undefined : entry.exceptions;
    const haystack = exceptions?.length
      ? withoutExceptions(normalized, exceptions)
      : normalized;

    if (haystack.includes(` ${term} `)) return { term };
    // Also catch it inside a longer run of letters, e.g. "xxbadwordxx".
    if (term.length >= 4 && haystack.includes(term)) return { term };
  }

  return null;
}

/**
 * Removes known-innocent phrases (e.g. `sparse`) from the haystack before a
 * term is matched against it, so a term that's a substring of an innocent
 * word (e.g. `arse` inside `sparse`) doesn't block that word.
 */
function withoutExceptions(
  haystack: string,
  exceptions: readonly string[],
): string {
  let result = haystack;
  for (const exception of exceptions) {
    result = result.split(exception).join(" ");
  }
  return result;
}
