import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const confirmSchema = z.object({
  token_hash: z.string().min(1),
  // The email templates always send `email`; the older types are accepted in
  // case a link from a default Supabase template is followed.
  type: z.enum(["email", "magiclink", "signup"]),
});

/**
 * Completes a magic-link sign-in: verifies the token from the email link,
 * which sets the session cookies, then sends the owner to their board. Works
 * even when the link is opened on a different device than the one that
 * requested it.
 */
export async function GET(request: NextRequest) {
  const parsed = confirmSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  if (parsed.success) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: parsed.data.type,
      token_hash: parsed.data.token_hash,
    });

    if (!error) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
