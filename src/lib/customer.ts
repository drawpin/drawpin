import type { SupabaseClient } from "@supabase/supabase-js";
import { getOwner } from "@/lib/auth";

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
 */
export async function getCustomer(
  admin: SupabaseClient,
): Promise<Customer | null> {
  const user = await getOwner();
  if (!user) return null;

  const { data, error } = await admin
    .from("profiles")
    .select("id, username")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error(`Could not load profile: ${error.message}`);
  return data ? { id: data.id, username: data.username } : null;
}
