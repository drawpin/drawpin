/**
 * The custom blocklist half of moderation (docs/PLAN.md, Moderation). It runs
 * before the OpenAI check because it's instant and free.
 *
 * It holds no word list of its own — this repository is public. What it
 * matches here is spam that moderation models don't flag (links, email
 * addresses and phone numbers) plus whatever terms are handed to it: the
 * built-in profanity list from `profanity-terms.ts` (OpenAI's text
 * moderation has a documented blind spot on slurs and contextual hate
 * speech) and any extra words a venue owner adds privately through
 * `MODERATION_BLOCKLIST`.
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
 * Cyrillic and Greek letters that look like Latin ones. NFKD doesn't touch
 * them — they're different letters, not accented ones — so a word typed with
 * a Cyrillic "о" would otherwise sail past the list looking identical.
 */
const LOOKALIKES: Record<string, string> = {
  а: "a",
  в: "b",
  е: "e",
  ё: "e",
  і: "i",
  ї: "i",
  ј: "j",
  к: "k",
  м: "m",
  н: "h",
  о: "o",
  р: "p",
  с: "c",
  ѕ: "s",
  т: "t",
  у: "y",
  х: "x",
  α: "a",
  β: "b",
  ε: "e",
  η: "n",
  ι: "i",
  κ: "k",
  ν: "v",
  ο: "o",
  ρ: "p",
  τ: "t",
  υ: "u",
  χ: "x",
};

/**
 * Lowercases, strips accents, and undoes common letter/number swaps and
 * look-alike letters from other alphabets, so `Ｂ.A.D`, `bád`, `b4d` and a
 * Cyrillic `bаd` all normalize to the same text.
 */
export function normalizeForBlocklist(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\x00-\x7f]/g, (char) => LOOKALIKES[char] ?? char)
    .replace(/[01345 7@$]/g, (char) => LEET_REPLACEMENTS[char] ?? char)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * `f u c k` → `fuck`: a run of three or more single letters is read as one
 * word. A single short gap — "a b" — is left alone.
 */
function joinSingleLetters(text: string): string {
  return text.replace(/\b(?:[a-z0-9] ){2,}[a-z0-9]\b/g, (run) =>
    run.replace(/ /g, ""),
  );
}

/**
 * The spellings a caption might be hiding a word behind, each checked the
 * same way as the text itself: as typed; with spaced or dotted single letters
 * joined up; with a letter stretched three or more times cut back to two and
 * to one (`gooook` → `gook`, `fuuuck` → `fuck`); and with "ph" read as "f".
 *
 * Only runs of three or more are squeezed, so ordinary double letters — "as",
 * "good", "class" — are never changed into something else. There is
 * deliberately no allowance for typos: one letter away from a slur or a swear
 * is also "bigger", "where", "pitch" and "ditch".
 */
function spellingsOf(normalized: string): string[] {
  const spellings = new Set<string>();
  for (const text of [normalized, joinSingleLetters(normalized)]) {
    spellings.add(text);
    spellings.add(text.replace(/([a-z])\1{2,}/g, "$1$1"));
    spellings.add(text.replace(/([a-z])\1{2,}/g, "$1"));
    spellings.add(text.replace(/ph/g, "f"));
  }
  return [...spellings];
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
 * trip inside (from `profanity-terms.ts`) — e.g. the term `arse` exempting
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
  const spellings = spellingsOf(normalizeForBlocklist(text)).map(
    (spelling) => ` ${spelling} `,
  );
  for (const entry of blockedTerms) {
    const term = typeof entry === "string" ? entry : entry.term;
    const exceptions = typeof entry === "string" ? undefined : entry.exceptions;

    for (const spelling of spellings) {
      const haystack = exceptions?.length
        ? withoutExceptions(spelling, exceptions)
        : spelling;

      if (haystack.includes(` ${term} `)) return { term };
      // Also catch it inside a longer run of letters, e.g. "xxbadwordxx".
      if (term.length >= 4 && haystack.includes(term)) return { term };
    }
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
