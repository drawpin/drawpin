import { z } from "zod";
import { serverEnv } from "@/lib/env";

const ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Kept short: a visitor is waiting on this before their action is accepted. */
const TIMEOUT_MS = 5_000;
const RETRY_DELAY_MS = 300;

/** Cloudflare couldn't be reached, so nothing was verified. */
export class TurnstileUnavailableError extends Error {
  constructor(cause: string) {
    super(`Turnstile unavailable: ${cause}`);
    this.name = "TurnstileUnavailableError";
  }
}

const responseSchema = z.object({
  success: z.boolean(),
  "error-codes": z.array(z.string()).optional(),
});

export type TurnstileResult =
  | { passed: true }
  /** `codes` are Cloudflare's reasons, for the server log only. */
  | { passed: false; codes: string[] };

/**
 * Checks a Turnstile token with Cloudflare.
 *
 * A token is single-use and short-lived, so each submission needs a fresh one.
 * An expired or reused token comes back as a normal failure, not an outage.
 *
 * @throws {TurnstileUnavailableError} On timeout, network error, a non-OK
 * response, or an unreadable body — after one retry. Callers refuse the action
 * rather than accepting it unverified.
 */
export async function verifyTurnstileToken(
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TurnstileResult> {
  if (!token) return { passed: false, codes: ["missing-input-response"] };

  const body = new URLSearchParams({
    secret: serverEnv().TURNSTILE_SECRET_KEY,
    response: token,
  });

  let lastError = "unknown";
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await delay(RETRY_DELAY_MS);

    try {
      const response = await fetchImpl(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        continue;
      }

      const parsed = responseSchema.safeParse(await response.json());
      if (!parsed.success) {
        lastError = "unexpected response shape";
        continue;
      }

      return parsed.data.success
        ? { passed: true }
        : { passed: false, codes: parsed.data["error-codes"] ?? [] };
    } catch (error) {
      lastError = error instanceof Error ? error.name : "request failed";
    }
  }

  throw new TurnstileUnavailableError(lastError);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
