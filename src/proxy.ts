import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";

/**
 * Refreshes the signed-in person's Supabase session before any page renders.
 * Server Components can't write cookies, so without this an expired access
 * token (they last an hour) is refreshed but the rotated refresh token is
 * lost, and the person looks signed out. Owners and customers both have
 * accounts (ADR-007), so every page needs it.
 */
export async function proxy(request: NextRequest) {
  const env = serverEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  await supabase.auth.getClaims();

  return response;
}

export const config = {
  // Every route except static assets and the cron/health endpoints, which
  // never read a session and shouldn't pay for the refresh. Route handlers
  // that do read it (account downloads, auth callbacks) stay included.
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|api/cron|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
