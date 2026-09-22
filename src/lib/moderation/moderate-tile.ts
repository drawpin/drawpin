import { findBlockedTerm, type BlockedTerm } from "./blocklist";
import { classifyDrawing } from "./nsfw-drawing";
import { checkWithOpenAi, type ModerationInput } from "./openai";
import { defaultProfanityTerms } from "./profanity-terms";

export type TileContent = {
  displayName: string | null;
  caption: string | null;
  /** The processed WebP tile image, or `null` when checking text alone. */
  image: Buffer | null;
};

export type ModerationDecision =
  | { allowed: true }
  /** `reason` is for the server log only; visitors get a generic message. */
  | { allowed: false; reason: string };

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
};

/**
 * Checks a post before it's published: the blocklist first (instant, free),
 * then OpenAI on the name, caption and drawing together. Also used for a
 * username on its own, where there's no drawing to check.
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
    if (match)
      return { allowed: false, reason: `blocklist:${field}:${match.term}` };
  }

  const text = [content.displayName, content.caption]
    .filter(Boolean)
    .join("\n")
    .trim();

  const input: ModerationInput = {
    text: text || null,
    image: content.image ? { dataUrl: toDataUrl(content.image) } : null,
  };

  const check = deps.check ?? checkWithOpenAi;
  const checkDrawing = deps.checkDrawing ?? classifyDrawing;

  // Run together: the drawing check is in-process (no network round trip),
  // so this adds no meaningful latency to the OpenAI call on the common
  // (warm) path.
  const [verdict, drawing] = await Promise.all([
    check(input, deps.apiKey),
    content.image
      ? checkDrawing(content.image)
      : Promise.resolve({ flagged: false, label: "no-image" }),
  ]);

  if (verdict.flagged) {
    return {
      allowed: false,
      reason: `openai:${verdict.categories.join(",")}`,
    };
  }
  if (drawing.flagged) {
    return { allowed: false, reason: `nsfw-drawing:${drawing.label}` };
  }
  return { allowed: true };
}

function toDataUrl(image: Buffer): string {
  return `data:image/webp;base64,${image.toString("base64")}`;
}
