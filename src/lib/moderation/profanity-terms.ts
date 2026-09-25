/**
 * The built-in profanity half of the blocklist (docs/PLAN.md, Moderation).
 * OpenAI's moderation model has a documented blind spot on nuanced and
 * contextual hate speech, and its categories can't be tuned or extended —
 * so a plain slur can slip through it. This gives the blocklist (which
 * already runs before OpenAI, for free) a second, built-in source of terms,
 * on top of whatever a venue owner adds themselves through
 * `MODERATION_BLOCKLIST`.
 *
 * For now this blocks every category in the source list, not just slurs —
 * see {@link MIN_SEVERITY}. Board owners choosing their own moderation
 * strictness is back-pocket (docs/PLAN.md, Back pocket); until then, one
 * fixed list applies to every board.
 *
 * Terms come from `@dsojevic/profanity-list` (MIT-licensed,
 * https://github.com/dsojevic/profanity-list) rather than being authored
 * here, for the same reason the blocklist has never held its own slur list:
 * this repository is public.
 */
import { z } from "zod";
import profanityEn from "@dsojevic/profanity-list/en.json";
import { normalizeForBlocklist, type BlockedTerm } from "./blocklist";

const entrySchema = z.object({
  id: z.string(),
  /** `|` separates alternate spellings; `*` after a character means "one or
   * more of this character" (elongation), e.g. `lo*ng` matches "looong". */
  match: z.string(),
  /** 1 (mild) to 4 (severe). */
  severity: z.number(),
  tags: z.array(z.string()).optional(),
  /** `*` is a placeholder for the matched word, e.g. `sp*` on `arse` means
   * "sparse" isn't a match. */
  exceptions: z.array(z.string()).optional(),
});

export type ProfanityListEntry = z.infer<typeof entrySchema>;

/**
 * Below "strong" (3), entries in the source list are ambiguous general
 * insults rather than clear profanity (its own docs give "addict" as a
 * severity-1 example) — blocking those risks false-positiving an ordinary
 * caption.
 */
const MIN_SEVERITY = 3;

/**
 * Ordinary words that terms in the source list turn up inside, which it
 * doesn't exempt itself. Found by running the 10,000 most common English
 * words through the list, plus everyday words just below that — a caption
 * about grapes or a therapist was being refused. Merged into each term's own
 * exceptions, so the term is still caught everywhere else, including inside
 * run-together text.
 */
const EXTRA_EXCEPTIONS: Record<string, string[]> = {
  cialis: ["specialis"],
  paki: ["pakistan"],
  rape: ["grape", "drape", "scrape", "trapez", "therapeu", "rapeseed"],
  rapist: ["therapist"],
};

/**
 * Turns raw `@dsojevic/profanity-list` entries into {@link BlockedTerm}s:
 * keeps entries at or above {@link MIN_SEVERITY} (regardless of category —
 * see the module doc), splits each `match` on `|` into separate terms,
 * strips `*` elongation markers (the blocklist catches stretched letters
 * itself, for every term — see `spellingsOf` in blocklist.ts — so `lo*ng`
 * becomes the plain word `long`), and expands each entry's `exceptions`
 * against every one of its alternates, adding {@link EXTRA_EXCEPTIONS}.
 *
 * Exported separately from {@link defaultProfanityTerms} so this transform
 * can be unit-tested against small, made-up entries instead of the real
 * list — this repository is public, and real slurs don't belong in a test
 * file.
 */
export function selectProfanityTerms(
  entries: ProfanityListEntry[],
): BlockedTerm[] {
  const terms: BlockedTerm[] = [];

  for (const entry of entries) {
    if (entry.severity < MIN_SEVERITY) continue;

    const alternates = entry.match.split("|").map(stripElongation);
    const exceptions = (entry.exceptions ?? []).flatMap((exception) =>
      alternates.map((alt) =>
        normalizeForBlocklist(exception.replaceAll("*", alt)),
      ),
    );

    for (const alt of alternates) {
      const term = normalizeForBlocklist(alt);
      const extra = (EXTRA_EXCEPTIONS[term] ?? []).map(normalizeForBlocklist);
      terms.push({ term, exceptions: [...exceptions, ...extra] });
    }
  }

  return terms;
}

function stripElongation(pattern: string): string {
  return pattern.replaceAll("*", "");
}

let cached: BlockedTerm[] | null = null;

/** The built-in profanity list, parsed and filtered once per process. */
export function defaultProfanityTerms(): BlockedTerm[] {
  if (!cached) {
    cached = selectProfanityTerms(entrySchema.array().parse(profanityEn));
  }
  return cached;
}
