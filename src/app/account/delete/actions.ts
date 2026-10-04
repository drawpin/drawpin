"use server";

import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/customer";
import { deleteAccount } from "@/lib/delete-account";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SupabaseDeleteAccountStore } from "@/lib/supabase-delete-account-store";

export type DeleteAccountState =
  { status: "idle" } | { status: "error"; message: string };

/**
 * Deletes the signed-in customer's DrawPin account, then signs them out
 * (docs/PLAN.md, Accounts). Owners have no profile, so this never reaches
 * a board; theirs closes from the owner screen instead (ADR-009).
 */
export async function deleteAccountAction(): Promise<DeleteAccountState> {
  const admin = createAdminClient();
  const customer = await getCustomer(admin);
  if (!customer) redirect("/");

  try {
    await deleteAccount(customer.id, {
      store: new SupabaseDeleteAccountStore(admin),
      logError: console.error,
    });
  } catch (error) {
    console.error("deleteAccountAction failed", error);
    return {
      status: "error",
      message: "We couldn't delete your account. Try again in a minute.",
    };
  }

  console.info(`Account deleted: ${customer.id}`);
  // The login is already gone; clearing this device's session is all that's
  // left, and failing to is no reason to stop.
  await (await createClient()).auth.signOut().catch(() => undefined);
  redirect("/");
}
