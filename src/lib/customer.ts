import type { SupabaseClient } from "@supabase/supabase-js";
import { getOwner, getSignedInUserId } from "@/lib/auth";

export type Customer = { id: string; username: string };

/**
 * The signed-in customer, or `null` for a guest.
 *
 * A customer is a signed-in account with a `profiles` row. Owners share the
 * same auth system but have an `owners` row instead, so an owner browsing a
 * board counts as a guest until they sign in as a customer too
 * (docs/adr/004-customer-accounts.md).
 *
 * @param admin - A service-role client; `profiles` has no insert policy, and
 * reading through it avoids a second round trip for the session.
 * @param options.check - How the session is checked. `"server"` (the
 *   default) asks the auth server, so a session signed out elsewhere is
 *   caught at once: use it for anything that changes data. `"token"` checks
 *   the session token's signature locally, saving that round trip on every
 *   page view (see {@link getSignedInUserId}); use it only to show a page.
 */
export async function getCustomer(
  admin: SupabaseClient,
  { check = "server" }: { check?: "server" | "token" } = {},
): Promise<Customer | null> {
  const userId =
    check === "token" ? await getSignedInUserId() : (await getOwner())?.id;
  if (!userId) return null;

  const { data, error } = await admin
    .from("profiles")
    .select("id, username")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(`Could not load profile: ${error.message}`);
  return data ? { id: data.id, username: data.username } : null;
}
