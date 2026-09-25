/**
 * What kind of thing got a post refused, in terms the poster is told.
 *
 * Deliberately coarse: enough for someone who tripped a check by accident to
 * see what to change, never the exact word or rule that matched, which would
 * only teach someone how to get round it.
 */
export type ModerationCategory =
  "hateful" | "sexual" | "violent" | "contact" | "language";

/**
 * The category for a term from the built-in profanity list, from its tags:
 * slurs aimed at race, sexuality or religion are hateful, sexual terms are
 * sexual, and the rest — general or shock profanity — is language.
 */
export function categoryForTags(
  tags: readonly string[] | undefined,
): ModerationCategory {
  if (tags?.some((tag) => ["racial", "lgbtq", "religious"].includes(tag))) {
    return "hateful";
  }
  if (tags?.includes("sexual")) return "sexual";
  return "language";
}

/**
 * The category for what OpenAI's moderation flagged, from its category names
 * (e.g. `hate/threatening`, `sexual/minors`). Hate and harassment come first:
 * when a post trips several, the most serious is the one to name.
 */
export function categoryForOpenAi(
  categories: readonly string[],
): ModerationCategory {
  const has = (prefix: string) =>
    categories.some((category) => category.startsWith(prefix));
  if (has("hate") || has("harassment")) return "hateful";
  if (has("sexual")) return "sexual";
  if (has("violence") || has("self-harm") || has("illicit")) return "violent";
  return "language";
}
