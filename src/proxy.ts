import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { DEVICE_BOARDS_COOKIE, parseDeviceBoards } from "@/lib/device-boards";
import { serverEnv } from "@/lib/env";
import { mergeDeviceBoards } from "@/lib/my-boards";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseMyBoardsStore } from "@/lib/supabase-my-boards";

/**
 * Moves the boards this device remembered while signed out into the account
 * it's now signed in to, then forgets them on the device (ADR-015).
 *
 * Done here, on the first signed-in request, rather than in each place a
 * sign-in completes (Google's callback, the emailed code, the emailed link):
 * every one of them ends in a request through here, and a sign-in added
 * later is covered without remembering to call it. It costs nothing on any
 * other request: signed out, or with no device list, it's skipped before any
 * database call. If the merge fails, the cookie stays and the next request
 * tries again.
 */
async function mergeDeviceList(
  request: NextRequest,
  response: NextResponse,
  userId: string,
): Promise<void> {
  const value = request.cookies.get(DEVICE_BOARDS_COOKIE)?.value;
  if (value === undefined) return;

  try {
    await mergeDeviceBoards(
      userId,
      parseDeviceBoards(value),
      supabaseMyBoardsStore(createAdminClient()),
    );
  } catch (error) {
    console.error("Could not merge the device's boards", error);
    return;
  }
  // The page rendering now reads the account's list whatever the request
  // still carries; this only stops the next request merging again.
  response.cookies.delete(DEVICE_BOARDS_COOKIE);
}

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

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (userId) await mergeDeviceList(request, response, userId);

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
