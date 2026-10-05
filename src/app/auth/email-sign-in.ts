"use server";

import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/next-path";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { TURNSTILE_FIELD } from "@/lib/turnstile/field";
import { checkTurnstile } from "@/lib/turnstile/guard";
import { codeSchema, emailSchema } from "./email-sign-in-schema";

export type EmailSignInState =
  | { status: "idle" }
  | { status: "error"; message: string; email?: string }
  | { status: "sent"; email: string };

/**
 * Emails a customer a sign-in code (ADR-010). A code rather than a
 * link, because the in-app browser a QR scan opens loses the session when a
 * link opens somewhere else; the code is typed on the page they're on.
 *
 * Signing in with a new address creates the account, then /welcome asks for
 * a username, the same as after Google.
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

  // An account is an owner or a customer, never both (ADR-004).
  const { data: owner, error: ownerError } = await createAdminClient()
    .from("owners")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (ownerError) {
    console.error("sendEmailCode: owner lookup failed", ownerError);
    return {
      status: "error",
      message: "We couldn't send the email. Try again in a moment.",
    };
  }
  if (owner) {
    return {
      status: "error",
      message:
        "That email is a board owner's sign-in. To draw, use a different email or Google.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
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
 * Checks the code and signs the customer in on this device, then returns
 * them where they were, or to /welcome to pick a username the first time.
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

  const { data: profile, error: profileError } = await createAdminClient()
    .from("profiles")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profileError) {
    throw new Error(`Could not load profile: ${profileError.message}`);
  }

  redirect(profile ? next : `/welcome?next=${encodeURIComponent(next)}`);
}
