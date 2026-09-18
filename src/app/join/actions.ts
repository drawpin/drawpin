"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hashIpAddress } from "@/lib/device-id";
import { clientIpFrom } from "@/lib/device-signals/request-ip";
import { type JoinFailure, joinWithCode } from "@/lib/daily-code/join";
import { SupabaseJoinStore } from "@/lib/daily-code/supabase-join-store";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { type JoinState, joinSchema } from "./schema";

const FAILURE_MESSAGES: Record<JoinFailure, string> = {
  malformed: "Enter the 8-digit code.",
  unknown: "That code isn't right. Codes change every morning at 4:00 AM.",
  "rate-limited": "Too many tries. Wait a few minutes and try again.",
};

/** Opens the board whose code the visitor typed. */
export async function joinBoard(
  _previous: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const parsed = joinSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  const ip = clientIpFrom(await headers());
  const result = await joinWithCode(
    {
      code: parsed.data.code,
      ipHash: ip ? hashIpAddress(ip, serverEnv().DEVICE_COOKIE_SECRET) : null,
      now: new Date(),
    },
    new SupabaseJoinStore(createAdminClient()),
  );

  if (!result.ok) {
    return { status: "error", message: FAILURE_MESSAGES[result.reason] };
  }

  redirect(`/b/${result.slug}`);
}
