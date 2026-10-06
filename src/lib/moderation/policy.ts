/**
 * What each board moderation level blocks (ADR-012). The owner picks the
 * level; this decides which kinds of content it refuses and which checks it
 * runs. The checks themselves don't change between levels, only which of
 * their findings count.
 */
import type { BlockedTerm } from "./blocklist";
import { categoryForOpenAi, type ModerationCategory } from "./categories";

/** A board's moderation level, as stored in `venues.moderation_level`. */
export type ModerationLevel = "all_ages" | "standard" | "late_night";

type ModerationPolicy = {
  /**
   * The kinds of content refused. `language` is swearing, `violent` covers
   * violence, gore, self-harm and illicit content, and `contact` is links,
   * email addresses and phone numbers.
   */
  blocks: ReadonlySet<ModerationCategory>;
  /** Whether the site-wide extra terms in `MODERATION_BLOCKLIST` apply. */
  extraTerms: boolean;
  /** Whether the drawing goes to the nudity check and the vision model. */
  readsDrawing: boolean;
};

const POLICIES: Record<ModerationLevel, ModerationPolicy> = {
  // Today's rules, unchanged.
  all_ages: {
    blocks: new Set(["hateful", "sexual", "violent", "contact", "language"]),
    extraTerms: true,
    readsDrawing: true,
  },
  // Swearing, violence and gore are allowed.
  standard: {
    blocks: new Set(["hateful", "sexual", "contact"]),
    extraTerms: true,
    readsDrawing: true,
  },
  // No moderation beyond the legal floor, so nothing to read the drawing for.
  late_night: {
    blocks: new Set(),
    extraTerms: false,
    readsDrawing: false,
  },
};

/**
 * OpenAI's category for sexual content involving minors. It blocks on every
 * level: hosting it is illegal, so it isn't the owner's to allow (ADR-012).
 */
const LEGAL_FLOOR = "sexual/minors";

/** The rules for a moderation level. */
export function policyFor(level: ModerationLevel): ModerationPolicy {
  return POLICIES[level];
}

/**
 * Whether a category OpenAI's moderation flagged blocks the post on this
 * level. A category OpenAI adds later reads as `language`, the way
 * {@link categoryForOpenAi} names it, so it still blocks on All Ages.
 */
export function blocksOpenAiCategory(
  policy: ModerationPolicy,
  category: string,
): boolean {
  return (
    category === LEGAL_FLOOR || policy.blocks.has(categoryForOpenAi([category]))
  );
}

/**
 * The blocklist terms that apply on this level: the built-in profanity terms
 * whose category it blocks, then the site-wide extra terms if it uses them.
 * A plain string term counts as `language`, as the blocklist reports it.
 */
export function blockedTermsFor(
  policy: ModerationPolicy,
  profanityTerms: readonly BlockedTerm[],
  extraTerms: readonly BlockedTerm[],
): BlockedTerm[] {
  return [
    ...profanityTerms.filter((term) =>
      policy.blocks.has(
        (typeof term === "string" ? undefined : term.category) ?? "language",
      ),
    ),
    ...(policy.extraTerms ? extraTerms : []),
  ];
}
