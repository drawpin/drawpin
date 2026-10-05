import { z } from "zod";

/** An email address as the sign-in code is sent to it: trimmed, lowercased. */
export const emailSchema = z
  .email("Enter a valid email address.")
  .max(254)
  .transform((email) => email.trim().toLowerCase());

/**
 * The code from the email; spaces people type between digits are fine. Its
 * length is a project setting (6 locally, 8 by default on hosted projects),
 * so any length Supabase allows is accepted rather than tying this to one.
 */
export const codeSchema = z
  .string()
  .transform((code) => code.replace(/\s/g, ""))
  .pipe(z.string().regex(/^\d{6,10}$/, "Enter the code from the email."));
