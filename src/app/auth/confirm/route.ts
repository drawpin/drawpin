import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { destinationAfterSignIn } from "../after-sign-in";
import { parseConfirmParams } from "./params";

/**
 * Completes an emailed sign-in link, then sends the account on: to the page
 * it asked to come back to when the link carries one (`next`, checked as a
 * plain path on this site), or to /admin (which routes board runners); the first time, through
 * /welcome to pick a username.
 *
 * Accepts both link formats (see `ConfirmParams`): our custom template's
 * token hash, and the `?code=` redirect from Supabase's default template.
 * Either way a successful check sets the session cookies; anything else goes
 * back to the login page with an "invalid or expired link" message.
 */
export async function GET(request: NextRequest) {
  const params = parseConfirmParams(request.nextUrl.searchParams);

  if (params.kind !== "invalid") {
    const supabase = await createClient();
    const result =
      params.kind === "code"
        ? await supabase.auth.exchangeCodeForSession(
            params.code,
            params.flowId ? { flowId: params.flowId } : undefined,
          )
        : await supabase.auth.verifyOtp({
            type: params.type,
            token_hash: params.tokenHash,
          });

    const user = result.data.user;
    if (!result.error && user) {
      const destination = await destinationAfterSignIn(
        user.id,
        request.nextUrl.searchParams.get("next"),
        // The template's own link carries no `next`: it is the board
        // runner's link, and /admin routes them (list, one board, or setup).
        "/admin",
      );
      return NextResponse.redirect(new URL(destination, request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
