/**
 * Remembers, in this browser, which address was just sent a sign-in code
 * (ADR-010), so the code step survives the page being reloaded.
 *
 * A phone often reloads a tab after its person switches to their mail app
 * to read the code, which used to drop them back at the start with nowhere
 * to type it. Only the address is stored, never the code, and only for as
 * long as a code lasts.
 *
 * Storage can be missing or throw (private windows, blocked site data), so
 * every call fails quietly: the worst case is the old behaviour.
 */

const KEY = "drawpin:email-code";

/** How long a sent code is worth offering to type: the code's own expiry. */
export const PENDING_CODE_MS = 15 * 60 * 1000;

/** Notes that `email` was just sent a code. */
export function savePendingEmail(email: string, now = Date.now()): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ email, sentAt: now }));
  } catch {
    // No storage: the code step just won't survive a reload.
  }
}

/**
 * The address sent a code in the last {@link PENDING_CODE_MS}, if any.
 * Anything older, or unreadable, counts as none.
 */
export function readPendingEmail(now = Date.now()): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      "email" in value &&
      "sentAt" in value &&
      typeof value.email === "string" &&
      typeof value.sentAt === "number" &&
      now - value.sentAt >= 0 &&
      now - value.sentAt < PENDING_CODE_MS
    ) {
      return value.email;
    }
    return null;
  } catch {
    return null;
  }
}

/** Forgets the pending address, e.g. when someone switches to another one. */
export function clearPendingEmail(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear without storage.
  }
}
