import { z } from "zod";

export const joinSchema = z.object({
  code: z
    .string()
    .trim()
    // Typed with spaces or dashes on a phone keypad more often than not.
    .transform((value) => value.replace(/[\s-]/g, ""))
    .pipe(
      z.string().regex(/^[0-9]{8}$/, { message: "Enter the 8-digit code." }),
    ),
});

export type JoinState =
  { status: "idle" } | { status: "error"; message: string };
