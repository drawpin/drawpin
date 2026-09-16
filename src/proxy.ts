import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";

/**
 * Refreshes the owner's Supabase session before owner pages render. Server
 * Components can't write cookies, so without this an expired access token
 * would never be replaced and the owner would be signed out early.
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
  // Only owner routes carry a session. Customer board pages have no accounts,
  // so they skip this round trip entirely.
  matcher: ["/login", "/setup", "/admin/:path*"],
};
