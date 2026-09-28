import type { ModerationCategory } from "@/lib/moderation/categories";

/** What the drawing looked like to the checks, finishing "it …". */
const LOOKS_LIKE: Record<ModerationCategory, string> = {
  hateful: "looks like it has hateful words or symbols",
  sexual: "looks like it has sexual content",
  violent: "looks like it shows violence or someone getting hurt",
  contact: "looks like it has a link, an email or a phone number",
  language: "has language that isn't allowed here",
};

/**
 * What someone sees when their drawing is refused: what kind of problem, that
 * their post for the day is still theirs, and how many more tries they have
 * before the device is locked out until 4:00 AM.
 *
 * The category is enough for someone caught by accident to see what to change;
 * the exact word or rule that matched is never shown, since that would only
 * teach someone how to get round it.
 *
 * @param triesLeft - Blocked posts left today, at least 1 (at 0 the post is
 * refused as locked instead, with its own message).
 */
export function blockedMessage(
  category: ModerationCategory,
  triesLeft: number,
): string {
  const tries = triesLeft === 1 ? "1 try left" : `${triesLeft} tries left`;
  return `This one can't go up — it ${LOOKS_LIKE[category]}. Your post for today isn't used. ${tries} before 4:00 AM.`;
}
