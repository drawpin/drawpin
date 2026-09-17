import { TurnstileUnavailableError, verifyTurnstileToken } from "./verify";

const FAILED_MESSAGE =
  "That looked like an automated request. Reload the page and try again.";

const UNAVAILABLE_MESSAGE =
  "We couldn't check your browser right now. Try again in a minute.";

/**
 * Verifies a form's Turnstile token.
 *
 * Refuses rather than letting the action through when Cloudflare can't be
 * reached, the same way moderation does: unverified is never treated as
 * verified.
 *
 * @param field - The raw form value; anything that isn't a string fails.
 * @returns A message to show the visitor, or `null` when the check passed.
 */
export async function checkTurnstile(
  field: FormDataEntryValue | null,
): Promise<string | null> {
  const token = typeof field === "string" ? field : "";

  try {
    const result = await verifyTurnstileToken(token);
    if (result.passed) return null;

    console.error(`Turnstile rejected a request: ${result.codes.join(",")}`);
    return FAILED_MESSAGE;
  } catch (error) {
    if (error instanceof TurnstileUnavailableError) {
      console.error("Turnstile unavailable; refusing the request", error);
      return UNAVAILABLE_MESSAGE;
    }
    throw error;
  }
}
