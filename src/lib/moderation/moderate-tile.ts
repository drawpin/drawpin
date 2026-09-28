import { findBlockedTerm, type BlockedTerm } from "./blocklist";
import { categoryForOpenAi, type ModerationCategory } from "./categories";
import { classifyDrawing } from "./nsfw-drawing";
import { checkWithOpenAi, type ModerationInput } from "./openai";
import { defaultProfanityTerms } from "./profanity-terms";
import { checkWithVision, type VisionVerdict } from "./vision";

export type TileContent = {
  displayName: string | null;
  caption: string | null;
  /** The processed WebP tile image, or `null` when checking text alone. */
  image: Buffer | null;
};

export type ModerationDecision =
  | { allowed: true }
  | {
      allowed: false;
      /** For the server log only; it names exactly what matched. */
      reason: string;
      /** The kind of problem, which the poster is told (see categories.ts). */
      category: ModerationCategory;
    };

export type ModerationDeps = {
  apiKey: string;
  blockedTerms: string[];
  check?: typeof checkWithOpenAi;
  /** Built-in profanity list (profanity-terms.ts). Defaults to
   * {@link defaultProfanityTerms}; overridable so tests don't depend on the
   * real (public, third-party) word list. */
  profanityTerms?: BlockedTerm[];
  /** Drawing-aware nudity check (nsfw-drawing.ts), run alongside OpenAI's
   * image check. Overridable for tests. */
  checkDrawing?: typeof classifyDrawing;
  /** Reads the drawing — its text and any hate symbols (vision.ts).
   * Overridable for tests. */
  checkVision?: typeof checkWithVision;
};

/** Nothing seen, for text-only checks where there's no drawing to read. */
const NO_DRAWING: VisionVerdict = {
  text: "",
  symbols: [],
  hateful: false,
  sexual: false,
  reason: "no-image",
};

/**
 * Checks a post before it's published: the blocklist first (instant, free),
 * then, together, OpenAI's moderation on the name, caption and drawing, the
 * drawing nudity check, and a vision model reading the drawing (ADR-006).
 * The text the vision model reads goes through the blocklist too, so a slur
 * written into a drawing is caught by DrawPin's own list. Also used for a
 * username or board name on its own, where there's no drawing to check.
 *
 * @throws {ModerationUnavailableError} If OpenAI couldn't be reached, so the
 * caller can refuse the post without using up the visitor's daily post.
 */
export async function moderateTile(
  content: TileContent,
  deps: ModerationDeps,
): Promise<ModerationDecision> {
  const blockedTerms: BlockedTerm[] = [
    ...(deps.profanityTerms ?? defaultProfanityTerms()),
    ...deps.blockedTerms,
  ];

  for (const [field, text] of [
    ["name", content.displayName],
    ["caption", content.caption],
  ] as const) {
    const match = findBlockedTerm(text, blockedTerms);
    if (match) {
      return {
        allowed: false,
        reason: `blocklist:${field}:${match.term}`,
        category: match.category,
      };
    }
  }

  const text = [content.displayName, content.caption]
    .filter(Boolean)
    .join("\n")
    .trim();
  const image = content.image ? { dataUrl: toDataUrl(content.image) } : null;
  const input: ModerationInput = { text: text || null, image };

  const check = deps.check ?? checkWithOpenAi;
  const checkDrawing = deps.checkDrawing ?? classifyDrawing;
  const checkVision = deps.checkVision ?? checkWithVision;

  // All at once: the visitor waits for the slowest, not the sum.
  const [verdict, drawing, seen] = await Promise.all([
    check(input, deps.apiKey),
    content.image
      ? checkDrawing(content.image)
      : Promise.resolve({ flagged: false, label: "no-image" }),
    image
      ? checkVision(image, content.caption, deps.apiKey)
      : Promise.resolve(NO_DRAWING),
  ]);

  if (verdict.flagged) {
    return {
      allowed: false,
      reason: `openai:${verdict.categories.join(",")}`,
      category: categoryForOpenAi(verdict.categories),
    };
  }
  if (drawing.flagged) {
    return {
      allowed: false,
      reason: `nsfw-drawing:${drawing.label}`,
      category: "sexual",
    };
  }
  if (seen.hateful || seen.symbols.length > 0) {
    return {
      allowed: false,
      reason: `vision:hateful:${seen.symbols.join(",") || seen.reason}`,
      category: "hateful",
    };
  }
  if (seen.sexual) {
    return {
      allowed: false,
      reason: `vision:sexual:${seen.reason}`,
      category: "sexual",
    };
  }

  const written = findBlockedTerm(seen.text, blockedTerms);
  if (written) {
    return {
      allowed: false,
      reason: `blocklist:drawing:${written.term}`,
      category: written.category,
    };
  }
  return { allowed: true };
}

function toDataUrl(image: Buffer): string {
  return `data:image/webp;base64,${image.toString("base64")}`;
}
