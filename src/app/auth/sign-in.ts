"use server";

import { redirect } from "next/navigation";
import { serverEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/next-path";
import { createClient } from "@/lib/supabase/server";

/**
 * Starts a customer's Google sign-in and sends them to Google.
 *
 * Customers sign in with Google and owners by magic link (ADR-004), so this is
 * only ever a customer's route in.
 *
 * @param formData - Carries `next`, the page to return to afterwards.
 */
export async function signInWithGoogle(formData: FormData) {
  const raw = formData.get("next");
  const next = safeNextPath(typeof raw === "string" ? raw : null);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // Absolute, because Google redirects to Supabase, which redirects here.
      redirectTo: `${serverEnv().SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    console.error("Could not start Google sign-in", error);
    redirect(`${next}?error=sign-in`);
  }

  redirect(data.url);
}
