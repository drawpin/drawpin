import { vi } from "vitest";

/**
 * Fills in every server environment variable with a harmless placeholder.
 *
 * Tests that touch `serverEnv()` only care about one or two values, but the
 * schema validates all of them at once, so a test that stubbed its own subset
 * would break whenever an unrelated variable is added. Call this in
 * `beforeEach` and override the values the test actually cares about.
 */
export function stubServerEnv() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
  vi.stubEnv("SITE_URL", "http://localhost:3000");
  vi.stubEnv("DEVICE_COOKIE_SECRET", "x".repeat(32));
  vi.stubEnv("OPENAI_API_KEY", "sk-test");
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
  vi.stubEnv("TURNSTILE_SECRET_KEY", "secret-key");
}
