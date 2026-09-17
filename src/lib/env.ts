import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SITE_URL: z.url(),
  DEVICE_COOKIE_SECRET: z.string().min(32),
  OPENAI_API_KEY: z.string().min(1),
  /** Optional extra blocked words, comma-separated. Kept out of the repo. */
  MODERATION_BLOCKLIST: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/**
 * Returns the validated server environment, parsing it on first use.
 *
 * Parsed lazily rather than at import so `next build` can run without these
 * variables set (CI builds have none); a missing value fails the first request
 * that needs it instead.
 *
 * @throws {Error} If a variable is missing or malformed.
 */
export function serverEnv(): ServerEnv {
  if (cached) return cached;

  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment variables — ${problems}`);
  }

  cached = result.data;
  return cached;
}
