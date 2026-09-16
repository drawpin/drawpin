import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  DEVICE_COOKIE,
  DEVICE_COOKIE_MAX_AGE,
  signDeviceId,
  verifyDeviceCookie,
} from "@/lib/device-id";
import { serverEnv } from "@/lib/env";

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
 * @param admin - A service-role client; `devices` has no insert policy.
 */
export async function ensureDeviceId(admin: SupabaseClient): Promise<string> {
  const existing = await readDeviceId();

  if (existing) {
    const { data, error } = await admin
      .from("devices")
      .select("id")
      .eq("id", existing)
      .maybeSingle();
    if (error) throw new Error(`Could not look up device: ${error.message}`);
    // A validly signed cookie whose row is gone (e.g. a database reset) gets a
    // fresh device rather than a foreign key error.
    if (data) return existing;
  }

  const { data, error } = await admin
    .from("devices")
    .insert({})
    .select("id")
    .single();
  if (error) throw new Error(`Could not create device: ${error.message}`);

  const cookieStore = await cookies();
  cookieStore.set(
    DEVICE_COOKIE,
    signDeviceId(data.id, serverEnv().DEVICE_COOKIE_SECRET),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: DEVICE_COOKIE_MAX_AGE,
    },
  );

  return data.id;
}
