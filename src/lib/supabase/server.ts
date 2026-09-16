import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env";

/**
 * Creates a Supabase client bound to the current request's auth cookies, for
 * use in Server Components, Server Actions, and Route Handlers. Create a new
 * one per request — never share it.
 */
export async function createClient() {
  // cookies() first: it's what tells `next build` the calling page is dynamic.
  // Reading env first would throw during prerendering, where no env is set.
  const cookieStore = await cookies();
  const env = serverEnv();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components can't set cookies. Safe to ignore: the proxy
            // refreshes the session and writes the cookies on the next request.
          }
        },
      },
    },
  );
}
