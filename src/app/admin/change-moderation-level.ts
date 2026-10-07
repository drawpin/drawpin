import { z } from "zod";
import { moderationLevelSchema } from "@/lib/moderation/level-schema";
import type { ModerationLevel } from "@/lib/moderation/policy";

/** The Board rules form, as the owner admin posts it. */
export const moderationLevelFormSchema = z.object({
  moderationLevel: moderationLevelSchema,
});

/** The subset of a Postgres error returned by supabase-js that this needs. */
type UpdateError = { message: string };

export type UpdateModerationLevel = (
  level: ModerationLevel,
) => Promise<{ error: UpdateError | null }>;

export type ChangeLevelResult = "changed" | "unchanged";

/**
 * Changes what a board's posts are checked for (ADR-012).
 *
 * Only new posts are affected: drawings already on the board stay and nothing
 * is checked again, so this is a single write.
 *
 * @returns `"unchanged"` when the board is already on that level, so a
 * double-submitted form costs no write and no log line.
 * @throws {Error} On any database error.
 */
export async function changeModerationLevel(
  current: ModerationLevel,
  next: ModerationLevel,
  update: UpdateModerationLevel,
): Promise<ChangeLevelResult> {
  if (current === next) return "unchanged";

  const { error } = await update(next);
  if (error) {
    throw new Error(`Could not change the moderation level: ${error.message}`);
  }

  return "changed";
}
