const TIMEOUT_MS = 5_000;

/**
 * Checks that OpenAI still accepts our key.
 *
 * Moderation is what stands between a drawing and the board: if the key has
 * expired or been revoked, every post is refused and the product looks like a
 * quiet evening (issue #64). The endpoint is free, so asking costs nothing.
 *
 * @returns `null` when the key works, or what's wrong with it.
 */
export async function checkOpenAiKey(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const response = await fetchImpl("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "omni-moderation-latest", input: "ok" }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (response.status === 401) return "key rejected";
  // Anything else non-OK is OpenAI having a moment rather than our key being
  // wrong; the posting path already retries those (src/lib/moderation).
  if (!response.ok) return `HTTP ${response.status}`;
  return null;
}

/**
 * Checks that Cloudflare still accepts our Turnstile secret.
 *
 * Deliberately sends a token that can't be valid: Cloudflare answers
 * `invalid-input-response` when the secret is fine and the token isn't, and
 * `invalid-input-secret` when the secret itself is wrong. The second is the
 * failure nobody would notice — posting and sign-in would refuse everyone.
 *
 * @returns `null` when the secret works, or what's wrong with it.
 */
export async function checkTurnstileSecret(
  secret: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const response = await fetchImpl(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: new URLSearchParams({ secret, response: "health-check" }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );

  if (!response.ok) return `HTTP ${response.status}`;

  const body = (await response.json()) as { "error-codes"?: string[] };
  const codes = body["error-codes"] ?? [];

  if (codes.includes("invalid-input-secret")) return "secret rejected";
  if (codes.includes("missing-input-secret")) return "secret missing";
  return null;
}
