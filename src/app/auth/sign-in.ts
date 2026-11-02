"use server";

import { redirect } from "next/navigation";
import { serverEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/next-path";
import { createClient } from "@/lib/supabase/server";

/**
 * Starts a Google sign-in and sends them to Google.
 *
 * Anyone signs in with Google (drawers and board owners, ADR-016); this is
 * one of the two ways in, the other being an emailed code.
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
