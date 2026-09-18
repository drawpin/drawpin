import { type NextRequest, NextResponse } from "next/server";
import { safeNextPath } from "@/lib/next-path";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Completes a customer's Google sign-in.
 *
 * Google sends them to Supabase, Supabase sends them here with `?code=`.
 * Someone signing in for the first time has no profile yet, so they go on to
 * pick a username; everyone else goes straight back where they were.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNextPath(params.get("next"));
  const code = params.get("code");

  if (!code) {
    // Supabase redirects here with `?error=…` when someone cancels at Google.
    return NextResponse.redirect(new URL(`${next}?error=sign-in`, request.url));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error("Google sign-in could not be completed", error);
    return NextResponse.redirect(new URL(`${next}?error=sign-in`, request.url));
  }

  const { data: profile, error: lookupError } = await createAdminClient()
    .from("profiles")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Could not load profile: ${lookupError.message}`);
  }

  const destination = profile
    ? next
    : `/welcome?next=${encodeURIComponent(next)}`;

  return NextResponse.redirect(new URL(destination, request.url));
}
