import { z } from "zod";
import { moderationLevelSchema } from "@/lib/moderation/level-schema";
import { isSupportedTimeZone } from "@/lib/timezones";
import { venueNameSchema } from "@/lib/venue-name";

export const setupSchema = z.object({
  // Shared with the rename form, so a name can't be set at setup that the
  // rename form would refuse (src/lib/venue-name.ts).
  name: venueNameSchema,
  timezone: z.string().refine(isSupportedTimeZone, {
    message: "Pick your venue's time zone.",
  }),
  // What the board's posts are checked for (ADR-012).
  moderationLevel: moderationLevelSchema,
});

export type SetupState =
  { status: "idle" } | { status: "error"; message: string };
