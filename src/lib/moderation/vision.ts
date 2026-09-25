import { z } from "zod";
import { ModerationUnavailableError } from "./openai";

const ENDPOINT = "https://api.openai.com/v1/chat/completions";

/**
 * Chosen by testing on the first test board's own drawings (ADR-006):
 * `gpt-4.1-mini` read faint hand-drawn text and recognised a swastika that
 * `gpt-4.1-nano` missed, for about $0.0005 a post.
 */
const MODEL = "gpt-4.1-mini";

/** Longer than the free check's: this one reads the drawing, not just labels it. */
const TIMEOUT_MS = 8_000;

/** One retry: a visitor is waiting, and an outage refuses the post anyway. */
const MAX_ATTEMPTS = 2;

/**
 * What the model is asked, which is where the policy lives: the board is
 * treated as family-friendly (a restaurant or a classroom), the caption is
 * judged together with the drawing, and cartoon nudity short of genitals or
 * sexual acts is allowed (ADR-006).
 */
const INSTRUCTIONS = [
  "You moderate drawings posted to a shared drawing board that is shown in family restaurants and classrooms.",
  "You are given the drawing and the caption its author typed. Judge them together.",
  "Report, as JSON:",
  "text: every word, letter or number written in the drawing, transcribed exactly even if faint, pale, stylised or misspelled. Empty if there is none. Never describe the picture.",
  "symbols: hate symbols only, such as a Nazi swastika, SS runes, a KKK hood or white-power symbols. Religious and national symbols, such as a Star of David, a cross, a crescent or a flag, are not hate symbols and never go here. Empty if none.",
  "hateful: true if the drawing or caption contains a slur, a hate symbol, a caricature mocking a group, or a message demeaning people for their race, religion, ethnicity, sexuality, gender or disability. A religious or national symbol on its own is not hateful.",
  "sexual: true if genitals or a sexual act are shown, however crude, cartoonish or simplified the drawing — a doodled penis or vulva counts. Nudity without those, such as a drawn bare chest or nipples, is not sexual.",
  "reason: a few words.",
].join("\n");

const verdictSchema = z.object({
  text: z.string(),
  symbols: z.array(z.string()),
  hateful: z.boolean(),
  sexual: z.boolean(),
  reason: z.string(),
});

/** What the model saw. `reason` is for the server log, never the poster. */
export type VisionVerdict = z.infer<typeof verdictSchema>;

const responseSchema = z.object({
  choices: z
    .array(z.object({ message: z.object({ content: z.string() }) }))
    .min(1),
});

/**
 * Asks a vision model to read a drawing: the text written in it, any hate
 * symbols, and whether it's hateful or sexual.
 *
 * This is what the free moderation endpoint can't do. It labels a picture but
 * doesn't transcribe what's written on it, and it let a hand-drawn slur, a
 * swastika and "NO GAY" in pale pink through on the first test board. The
 * text it reads is also run through the blocklist by the caller, so a slur
 * is caught by DrawPin's own list even if the model doesn't flag it.
 *
 * @param image - The processed tile, as a WebP data URL.
 * @throws {ModerationUnavailableError} On timeout, network error, a non-OK
 * response or an unreadable answer, after a retry — so the post is refused
 * without using up the visitor's daily post, like any other unchecked post.
 */
export async function checkWithVision(
  image: { dataUrl: string },
  caption: string | null,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<VisionVerdict> {
  const body = JSON.stringify({
    model: MODEL,
    // The same drawing should get the same answer every time it's checked.
    temperature: 0,
    messages: [
      { role: "system", content: INSTRUCTIONS },
      {
        role: "user",
        content: [
          { type: "text", text: `Caption: ${caption?.trim() || "(none)"}` },
          // Full detail: gpt-4.1-mini bills a 768px tile the same either way, and
          // low detail sometimes missed small things near the edge.
          {
            type: "image_url",
            image_url: { url: image.dataUrl, detail: "high" },
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "verdict",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["text", "symbols", "hateful", "sexual", "reason"],
          properties: {
            text: { type: "string" },
            symbols: { type: "array", items: { type: "string" } },
            hateful: { type: "boolean" },
            sexual: { type: "boolean" },
            reason: { type: "string" },
          },
        },
      },
    },
  });

  let lastError = "unknown";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetchImpl(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
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

      const verdict = verdictSchema.safeParse(
        JSON.parse(parsed.data.choices[0].message.content),
      );
      if (verdict.success) return verdict.data;
      lastError = "unexpected verdict shape";
    } catch (error) {
      lastError = error instanceof Error ? error.name : "request failed";
    }
  }

  throw new ModerationUnavailableError(`vision: ${lastError}`);
}
