/**
 * The form field carrying the Turnstile token.
 *
 * Lives here, not in the widget component: that file is `"use client"`, and a
 * constant imported from a client module into server code arrives as a client
 * reference rather than the string, so `formData.get()` would look up the
 * wrong key and every submission would fail as unverified.
 */
export const TURNSTILE_FIELD = "turnstileToken";
