/**
 * The form field carrying the browser fingerprint.
 *
 * Lives here rather than beside the component that fills it: that file is
 * `"use client"`, and a constant imported from a client module into server
 * code arrives as a client reference instead of the string, so `formData.get()`
 * would look up the wrong key.
 */
export const FINGERPRINT_FIELD = "deviceFingerprint";
