"use server";

import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: true },
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
