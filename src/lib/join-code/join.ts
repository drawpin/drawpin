/** Wrong guesses allowed from one network per {@link GUESS_WINDOW_MS}. */
export const GUESS_LIMIT = 20;

/** The window wrong guesses are counted over. */
export const GUESS_WINDOW_MS = 10 * 60 * 1000;

const CODE_PATTERN = /^[0-9]{8}$/;

/** What joining by code needs from the database. */
export interface JoinStore {
  /** The slug of the venue this code is live for, or `null`. */
  findVenueByCode(code: string, at: Date): Promise<string | null>;
  /** Wrong guesses already made from this network in this window. */
  countWrongGuesses(ipHash: string, windowStart: Date): Promise<number>;
  /** Counts a wrong guess; returns the window's new total. */
  recordWrongGuess(ipHash: string, windowStart: Date): Promise<number>;
}

export type JoinFailure = "malformed" | "unknown" | "rate-limited";

export type JoinResult =
  { ok: true; slug: string } | { ok: false; reason: JoinFailure };

export type JoinInput = {
  code: string;
  /** The visitor's hashed network, or `null` when no proxy reported one. */
  ipHash: string | null;
  now: Date;
};

/**
 * Turns a typed code into the board it opens (docs/PLAN.md, Joining).
 *
 * Eight digits is 100 million codes, which is only out of reach for a script if
 * guessing is slow, so wrong guesses are counted per network and cut off at
 * {@link GUESS_LIMIT}. A correct code never counts against the limit, so a café
 * full of customers typing the code they were given is unaffected.
 */
export async function joinWithCode(
  input: JoinInput,
  store: JoinStore,
): Promise<JoinResult> {
  // People type the code with spaces or dashes; only the digits matter.
  const code = input.code.replace(/[\s-]/g, "");
  if (!CODE_PATTERN.test(code)) return { ok: false, reason: "malformed" };

  const windowStart = windowStartFor(input.now);

  if (input.ipHash) {
    const used = await store.countWrongGuesses(input.ipHash, windowStart);
    if (used >= GUESS_LIMIT) return { ok: false, reason: "rate-limited" };
  }

  const slug = await store.findVenueByCode(code, input.now);
  if (slug) return { ok: true, slug };

  if (input.ipHash) await store.recordWrongGuess(input.ipHash, windowStart);
  return { ok: false, reason: "unknown" };
}

/**
 * The fixed window a moment falls in. Fixed rather than rolling, so the count
 * is one row per network: a guesser who times it right gets up to two windows'
 * worth in a row, which is still far too slow to matter.
 */
export function windowStartFor(now: Date): Date {
  return new Date(
    Math.floor(now.getTime() / GUESS_WINDOW_MS) * GUESS_WINDOW_MS,
  );
}
