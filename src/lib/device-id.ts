import { createHmac, timingSafeEqual } from "node:crypto";

export const DEVICE_COOKIE = "drawpin_device";

/** Browsers cap cookie lifetime at 400 days. */
export const DEVICE_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function hmac(secret: string, purpose: string, value: string): Buffer {
  // The purpose prefix keeps a signature made for one use from being valid
  // for another, since both uses share one secret.
  return createHmac("sha256", secret).update(`${purpose}:${value}`).digest();
}

/**
 * Signs a device id for the device cookie, so a visitor can't pick someone
 * else's id to dodge the daily post limit or borrow their name tag.
 *
 * @returns `"<deviceId>.<signature>"`.
 */
export function signDeviceId(deviceId: string, secret: string): string {
  const signature = hmac(secret, "device", deviceId).toString("base64url");
  return `${deviceId}.${signature}`;
}

/**
 * Checks a device cookie value.
 *
 * @returns The device id if the signature is valid, otherwise `null`.
 */
export function verifyDeviceCookie(
  value: string | undefined,
  secret: string,
): string | null {
  if (!value) return null;

  const separator = value.lastIndexOf(".");
  if (separator === -1) return null;

  const deviceId = value.slice(0, separator);
  if (!UUID_PATTERN.test(deviceId)) return null;

  const given = Buffer.from(value.slice(separator + 1), "base64url");
  const expected = hmac(secret, "device", deviceId);

  return given.length === expected.length && timingSafeEqual(given, expected)
    ? deviceId
    : null;
}

/**
 * Derives the 4-digit tag shown after a username, e.g. `4821` in
 * `Ahmad#4821`. The same device posting under the same name (ignoring case)
 * always gets the same tag; other devices using that name almost always get a
 * different one. Keyed with the secret, so tags can't be computed or chosen by
 * visitors.
 */
export function nameTagFor(
  deviceId: string,
  displayName: string,
  secret: string,
): string {
  const name = displayName.trim().normalize("NFC").toLowerCase();
  const number = hmac(secret, "name-tag", `${deviceId}:${name}`).readUInt32BE(
    0,
  );
  return String(number % 10_000).padStart(4, "0");
}
