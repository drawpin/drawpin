import { type NextRequest, NextResponse } from "next/server";
import { safeNextPath } from "@/lib/next-path";
import { createClient } from "@/lib/supabase/server";
import { destinationAfterSignIn } from "../after-sign-in";

/**
 * Completes a Google sign-in, for anyone: drawers and board owners alike
 * (ADR-016).
 *
 * Google sends them to Supabase, Supabase sends them here with `?code=`.
 * Someone signing in for the first time has no profile yet, so they go on to
 * pick a username (unless they're headed for the owner screens); everyone
 * else goes straight back where they were. `next` is checked as a plain path
 * on this site before it's followed.
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

  const destination = await destinationAfterSignIn(data.user.id, next);
  return NextResponse.redirect(new URL(destination, request.url));
}
