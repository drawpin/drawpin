import { z } from "zod";

/** Usernames aren't unique — the 4-digit tag is what tells two apart. */
export const usernameSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, { message: "Pick a name to draw under." })
    .max(40, { message: "That name is too long (40 characters max)." }),
});

export type WelcomeState =
  { status: "idle" } | { status: "error"; message: string };
