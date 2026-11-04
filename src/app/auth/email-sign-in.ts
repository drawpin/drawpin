"use server";

import { redirect } from "next/navigation";
import { serverEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/next-path";
import { createClient } from "@/lib/supabase/server";
import { TURNSTILE_FIELD } from "@/lib/turnstile/field";
import { checkTurnstile } from "@/lib/turnstile/guard";
import { destinationAfterSignIn } from "./after-sign-in";
import { codeSchema, emailSchema } from "./email-sign-in-schema";

export type EmailSignInState =
  | { status: "idle" }
  | { status: "error"; message: string; email?: string }
  | { status: "sent"; email: string };

/**
 * Emails anyone a sign-in code (ADR-010, ADR-016): drawers and board owners
 * share one sign-in. A code rather than a link, because the in-app browser a
 * QR scan opens loses the session when a link opens somewhere else; the code
 * is typed on the page they're on. The email carries a link too, which comes
 * back to `next`.
 *
 * Signing in with a new address creates the account, then /welcome asks for
 * a username (unless they're headed for the owner screens), the same as after
 * Google.
 */
export async function sendEmailCode(
  _previous: EmailSignInState,
  formData: FormData,
): Promise<EmailSignInState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }
  const email = parsed.data;

  // Before any email goes out: a script shouldn't be able to fire codes at
  // an address.
  const challenge = await checkTurnstile(formData.get(TURNSTILE_FIELD));
  if (challenge) return { status: "error", message: challenge };

  const raw = formData.get("next");
  const next = safeNextPath(typeof raw === "string" ? raw : null);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      // Where the email's link (not its code) comes back to. Must be in the
      // project's allowed redirect URLs.
      emailRedirectTo: `${new URL("/auth/confirm", serverEnv().SITE_URL)}?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    if (error.status === 429) {
      return {
        status: "error",
        message: "Too many codes sent. Wait a minute and try again.",
      };
    }
    console.error("sendEmailCode: signInWithOtp failed", error);
    return {
      status: "error",
      message: "We couldn't send the email. Try again in a moment.",
    };
  }

  return { status: "sent", email };
}

/**
 * Checks the code and signs the account in on this device, then returns it
 * where it was, or to /welcome to pick a username the first time.
 */
export async function verifyEmailCode(
  _previous: EmailSignInState,
  formData: FormData,
): Promise<EmailSignInState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { status: "idle" };

  const code = codeSchema.safeParse(formData.get("code"));
  if (!code.success) {
    return {
      status: "error",
      message: code.error.issues[0].message,
      email: email.data,
    };
  }

  const raw = formData.get("next");
  const next = safeNextPath(typeof raw === "string" ? raw : null);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.data,
    token: code.data,
    type: "email",
  });

  if (error || !data.user) {
    if (error?.status === 429) {
      return {
        status: "error",
        message: "Too many tries. Wait a few minutes and try again.",
        email: email.data,
      };
    }
    return {
      status: "error",
      message: "That code didn't work. Check it, or send a new one.",
      email: email.data,
    };
  }

  redirect(await destinationAfterSignIn(data.user.id, next));
}
