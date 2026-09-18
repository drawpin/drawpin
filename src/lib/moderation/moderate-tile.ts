import { findBlockedTerm } from "./blocklist";
import { checkWithOpenAi, type ModerationInput } from "./openai";

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
  for (const [field, text] of [
    ["name", content.displayName],
    ["caption", content.caption],
  ] as const) {
    const match = findBlockedTerm(text, deps.blockedTerms);
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
  const verdict = await check(input, deps.apiKey);

  return verdict.flagged
    ? { allowed: false, reason: `openai:${verdict.categories.join(",")}` }
    : { allowed: true };
}

function toDataUrl(image: Buffer): string {
  return `data:image/webp;base64,${image.toString("base64")}`;
}
