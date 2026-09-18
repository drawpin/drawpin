import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  DEVICE_COOKIE,
  DEVICE_COOKIE_MAX_AGE,
  signDeviceId,
  verifyDeviceCookie,
} from "@/lib/device-id";
import { serverEnv } from "@/lib/env";

/** Hashed signals about the visitor's browser and network, or `null` if unknown. */
export type DeviceSignals = {
  fingerprintHash: string | null;
  ipHash: string | null;
};

const NO_SIGNALS: DeviceSignals = { fingerprintHash: null, ipHash: null };

/**
 * Reads the visitor's device id from the signed device cookie, without
 * touching the database. Safe to call while rendering a page.
 *
 * @returns The device id, or `null` if there's no valid cookie.
 */
export async function readDeviceId(): Promise<string | null> {
  const cookieStore = await cookies();
  return verifyDeviceCookie(
    cookieStore.get(DEVICE_COOKIE)?.value,
    serverEnv().DEVICE_COOKIE_SECRET,
  );
}

/**
 * Returns the visitor's device id, creating a `devices` row and setting the
 * signed cookie if they don't have a valid one yet. Only call from a Server
 * Action or Route Handler, since it may set a cookie.
 *
 * With no valid cookie, a matching fingerprint reconnects the visitor to the
 * device they already had, so clearing cookies doesn't buy another post
 * (docs/PLAN.md, Device limiting). The fingerprint is only a fallback: a valid
 * cookie always wins, because the open-source fingerprint is approximate and
 * two identical phones can produce the same value.
 *
 * @param admin - A service-role client; `devices` has no insert policy.
 * @param signals - Hashed fingerprint and IP, both optional.
 */
export async function ensureDeviceId(
  admin: SupabaseClient,
  signals: DeviceSignals = NO_SIGNALS,
): Promise<string> {
  const existing = await readDeviceId();

  if (existing) {
    const { data, error } = await admin
      .from("devices")
      .select("id, fingerprint_hash")
      .eq("id", existing)
      .maybeSingle();
    if (error) throw new Error(`Could not look up device: ${error.message}`);
    // A validly signed cookie whose row is gone (e.g. a database reset) gets a
    // fresh device rather than a foreign key error.
    if (data) {
      await recordSignals(admin, existing, signals, data.fingerprint_hash);
      return existing;
    }
  }

  const matched = await findByFingerprint(admin, signals.fingerprintHash);
  if (matched) {
    await setDeviceCookie(matched);
    await recordSignals(admin, matched, signals, signals.fingerprintHash);
    return matched;
  }

  const { data, error } = await admin
    .from("devices")
    .insert({
      fingerprint_hash: signals.fingerprintHash,
      last_ip_hash: signals.ipHash,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Could not create device: ${error.message}`);

  await setDeviceCookie(data.id);
  return data.id;
}

/** The oldest device with this fingerprint, or `null` if there's no match. */
async function findByFingerprint(
  admin: SupabaseClient,
  fingerprintHash: string | null,
): Promise<string | null> {
  if (!fingerprintHash) return null;

  const { data, error } = await admin
    .from("devices")
    .select("id")
    .eq("fingerprint_hash", fingerprintHash)
    .order("first_seen_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not match fingerprint: ${error.message}`);

  return data?.id ?? null;
}

/**
 * Keeps the device's network current, and fills in its fingerprint the first
 * time we see one. An existing fingerprint is left alone: overwriting it would
 * hand the row to whichever browser touched it last.
 */
async function recordSignals(
  admin: SupabaseClient,
  deviceId: string,
  signals: DeviceSignals,
  storedFingerprint: string | null,
) {
  const update: { last_ip_hash?: string; fingerprint_hash?: string } = {};
  if (signals.ipHash) update.last_ip_hash = signals.ipHash;
  if (signals.fingerprintHash && !storedFingerprint) {
    update.fingerprint_hash = signals.fingerprintHash;
  }
  if (Object.keys(update).length === 0) return;

  const { error } = await admin
    .from("devices")
    .update(update)
    .eq("id", deviceId);
  if (error) throw new Error(`Could not record signals: ${error.message}`);
}

async function setDeviceCookie(deviceId: string) {
  const cookieStore = await cookies();
  cookieStore.set(
    DEVICE_COOKIE,
    signDeviceId(deviceId, serverEnv().DEVICE_COOKIE_SECRET),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: DEVICE_COOKIE_MAX_AGE,
    },
  );
}
