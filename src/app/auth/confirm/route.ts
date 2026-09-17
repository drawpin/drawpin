import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseConfirmParams } from "./params";

/**
 * Completes a magic-link sign-in, then sends the owner to their board.
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
    const { error } =
      params.kind === "code"
        ? await supabase.auth.exchangeCodeForSession(
            params.code,
            params.flowId ? { flowId: params.flowId } : undefined,
          )
        : await supabase.auth.verifyOtp({
            type: params.type,
            token_hash: params.tokenHash,
          });

    if (!error) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
