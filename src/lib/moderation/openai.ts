import { z } from "zod";

const ENDPOINT = "https://api.openai.com/v1/moderations";

/** Multimodal model: text categories plus violence/self-harm/sexual on images. */
const MODEL = "omni-moderation-latest";

/** Kept short: a visitor is waiting on this before their post is accepted. */
const TIMEOUT_MS = 5_000;

/**
 * The API returns sporadic empty-bodied 404s from its edge — the response has
 * no `openai-*` headers, so it never reached their application — at roughly one
 * call in three when measured directly with curl. A single retry isn't enough
 * to keep posting reliable; four quick attempts stay inside a visitor's
 * patience (worst case about two seconds of backoff).
 */
const MAX_ATTEMPTS = 4;

/** Backoff between attempts, multiplied by the attempt number. */
const RETRY_DELAY_MS = 300;

/** Statuses that mean the request itself is wrong, so retrying can't help. */
const PERMANENT_STATUSES = new Set([400, 401, 403]);

/** Moderation couldn't be reached or understood, so nothing was checked. */
export class ModerationUnavailableError extends Error {
  constructor(cause: string) {
    super(`Moderation unavailable: ${cause}`);
    this.name = "ModerationUnavailableError";
  }
}

const responseSchema = z.object({
  results: z
    .array(
      z.object({
        flagged: z.boolean(),
        categories: z.record(z.string(), z.boolean().nullable()),
      }),
    )
    .min(1),
});

export type ModerationInput = {
  text: string | null;
  /** The processed tile image, or `null` when there's nothing to check. */
  image: { dataUrl: string } | null;
};

export type ModerationVerdict = {
  flagged: boolean;
  /** Category names that tripped, for the server log. Never shown to visitors. */
  categories: string[];
};

/**
 * Asks OpenAI's moderation endpoint about a post's text and drawing in one
 * call. The endpoint is free and doesn't count toward usage limits.
 *
 * @throws {ModerationUnavailableError} On timeout, network error, a non-OK
 * response, or an unreadable body — after one retry. Callers refuse the post
 * rather than publishing it unchecked (docs/PLAN.md, Moderation).
 */
export async function checkWithOpenAi(
  input: ModerationInput,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ModerationVerdict> {
  const content: unknown[] = [];
  if (input.text) content.push({ type: "text", text: input.text });
  if (input.image) {
    content.push({
      type: "image_url",
      image_url: { url: input.image.dataUrl },
    });
  }
  if (content.length === 0) return { flagged: false, categories: [] };

  let lastError = "unknown";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await delay(RETRY_DELAY_MS * attempt);

    try {
      const response = await fetchImpl(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: MODEL, input: content }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        // A bad key or malformed request won't fix itself; anything else,
        // including the empty-bodied 404s the API returns intermittently,
        // usually succeeds on the next try.
        if (PERMANENT_STATUSES.has(response.status)) break;
        continue;
      }

      const parsed = responseSchema.safeParse(await response.json());
      if (!parsed.success) {
        lastError = "unexpected response shape";
        continue;
      }

      return summarize(parsed.data.results);
    } catch (error) {
      lastError = error instanceof Error ? error.name : "request failed";
    }
  }

  throw new ModerationUnavailableError(lastError);
}

function summarize(
  results: { flagged: boolean; categories: Record<string, boolean | null> }[],
): ModerationVerdict {
  const categories = new Set<string>();
  let flagged = false;

  for (const result of results) {
    if (result.flagged) flagged = true;
    for (const [category, tripped] of Object.entries(result.categories)) {
      if (tripped) categories.add(category);
    }
  }

  return { flagged, categories: [...categories].sort() };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
