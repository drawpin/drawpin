"use server";

import { serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { TURNSTILE_FIELD } from "@/lib/turnstile/field";
import { checkTurnstile } from "@/lib/turnstile/guard";
import { type LoginState, loginSchema } from "./schema";

/**
 * Emails the owner a single-use sign-in link. Signing in with a new address
 * creates the owner account, so this is also how owners sign up.
 */
export async function sendMagicLink(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  // Before sending any email: a script shouldn't be able to fire sign-in
  // emails at an address.
  const challenge = await checkTurnstile(formData.get(TURNSTILE_FIELD));
  if (challenge) return { status: "error", message: challenge };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: true,
      // Where Supabase's default email template sends the owner after
      // verifying the link. Must be in the project's allowed redirect URLs.
      emailRedirectTo: new URL(
        "/auth/confirm",
        serverEnv().SITE_URL,
      ).toString(),
    },
  });

  if (error) {
    if (error.status === 429) {
      return {
        status: "error",
        message: "Too many sign-in emails. Wait a minute and try again.",
      };
    }
    console.error("signInWithOtp failed", error);
    return {
      status: "error",
      message: "We couldn't send the email. Try again in a moment.",
    };
  }

  return { status: "sent", email: parsed.data.email };
}
