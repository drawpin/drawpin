/** The longest sign-in code Supabase can be set to send. */
const MAX_CODE_LENGTH = 10;

/** The shortest; a shorter run of digits in pasted text isn't the code. */
const MIN_CODE_LENGTH = 6;

/** Digits, with a space or a dash between any two, as people write codes. */
const DIGIT_RUN = /\d(?:[  \-‐-―]?\d)*/g;

/**
 * The sign-in code in pasted text, or null when there isn't one.
 *
 * A paste is often more than the code: "123 456", "1234-5678", or a whole
 * line of the email. The first run of digits that is a code's length wins,
 * with any spaces or dashes inside it dropped.
 */
export function findCode(text: string): string | null {
  for (const [run] of text.matchAll(DIGIT_RUN)) {
    const digits = run.replace(/\D/g, "");
    if (digits.length >= MIN_CODE_LENGTH && digits.length <= MAX_CODE_LENGTH) {
      return digits;
    }
  }
  return null;
}

/**
 * What the code box keeps of what's in it: its digits, no more than a code
 * can have. Spaces and dashes a person or an autofill adds are dropped.
 */
export function codeDigits(text: string): string {
  return text.replace(/\D/g, "").slice(0, MAX_CODE_LENGTH);
}
