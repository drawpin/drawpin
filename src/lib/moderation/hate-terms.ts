/**
 * The built-in slur/hate-term half of the blocklist (docs/PLAN.md,
 * Moderation). OpenAI's moderation model has a documented blind spot on
 * nuanced and contextual hate speech, and its categories can't be tuned or
 * extended — so a plain slur can slip through it. This gives the blocklist
 * (which already runs before OpenAI, for free) a second, built-in source of
 * terms, on top of whatever a venue owner adds themselves through
 * `MODERATION_BLOCKLIST`.
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
 * Categories in the source list that are slurs/hate speech rather than
 * general profanity. `general`, `sexual` and `shock` are deliberately left
 * out — OpenAI's own moderation wasn't reported as missing those, and
 * blocking mild profanity outright isn't this project's call to make.
 */
const HATE_TAGS = new Set(["racial", "lgbtq", "religious"]);

/**
 * Below "strong" (3), entries in the source list are ambiguous general
 * insults rather than slurs (its own docs give "addict" as a severity-1
 * example) — blocking those risks false-positiving an ordinary caption.
 */
const MIN_SEVERITY = 3;

/**
 * Turns raw `@dsojevic/profanity-list` entries into {@link BlockedTerm}s:
 * keeps only hate-speech categories at or above {@link MIN_SEVERITY}, splits
 * each `match` on `|` into separate terms, strips `*` elongation markers
 * (DrawPin's blocklist doesn't chase elongation, same as before this list
 * existed — e.g. `lo*ng` becomes the plain word `long`), and expands each
 * entry's `exceptions` against every one of its alternates.
 *
 * Exported separately from {@link defaultHateTerms} so this transform can be
 * unit-tested against small, made-up entries instead of the real list —
 * this repository is public, and real slurs don't belong in a test file.
 */
export function selectHateTerms(entries: ProfanityListEntry[]): BlockedTerm[] {
  const terms: BlockedTerm[] = [];

  for (const entry of entries) {
    if (entry.severity < MIN_SEVERITY) continue;
    if (!entry.tags?.some((tag) => HATE_TAGS.has(tag))) continue;

    const alternates = entry.match.split("|").map(stripElongation);
    const exceptions = (entry.exceptions ?? []).flatMap((exception) =>
      alternates.map((alt) =>
        normalizeForBlocklist(exception.replaceAll("*", alt)),
      ),
    );

    for (const alt of alternates) {
      terms.push({ term: normalizeForBlocklist(alt), exceptions });
    }
  }

  return terms;
}

function stripElongation(pattern: string): string {
  return pattern.replaceAll("*", "");
}

let cached: BlockedTerm[] | null = null;

/** The built-in hate-term list, parsed and filtered once per process. */
export function defaultHateTerms(): BlockedTerm[] {
  if (!cached) {
    cached = selectHateTerms(entrySchema.array().parse(profanityEn));
  }
  return cached;
}
