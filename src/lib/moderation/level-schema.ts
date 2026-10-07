import { z } from "zod";
import { MODERATION_LEVELS } from "./levels";

/**
 * A moderation level as a form posts it, for setup and the owner admin
 * (ADR-012). Both forms preselect a level, so a missing or unknown value is a
 * tampered form, not a choice. Apart from levels.ts so the forms that import
 * that don't pull Zod into the browser.
 */
export const moderationLevelSchema = z.enum(MODERATION_LEVELS, {
  error: "Pick the rules for your board.",
});
