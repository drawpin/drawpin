import { z } from "zod";
import { isSupportedTimeZone } from "@/lib/timezones";

export const setupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Enter your venue's name." })
    .max(120, { message: "Keep the name under 120 characters." }),
  timezone: z.string().refine(isSupportedTimeZone, {
    message: "Pick your venue's time zone.",
  }),
});

export type SetupInput = z.infer<typeof setupSchema>;

export type SetupState =
  { status: "idle" } | { status: "error"; message: string };
