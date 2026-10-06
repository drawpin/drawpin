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
 * (docs/PLAN.md, Accounts).
 *
 * One account can draw and own a board (ADR-013), and deleting the sign-in
 * would take the board with it (its owner row cascades from it). So an
 * account that owns a board is asked to close the board first, from the
 * owner screen (ADR-009), rather than losing it here by surprise.
 */
export async function deleteAccountAction(): Promise<DeleteAccountState> {
  const admin = createAdminClient();
  const customer = await getCustomer(admin);
  if (!customer) redirect("/");

  const { data: board, error: boardError } = await admin
    .from("venues")
    .select("id")
    .eq("owner_id", customer.id)
    .maybeSingle();
  if (boardError) {
    console.error("deleteAccountAction: board check failed", boardError);
    return {
      status: "error",
      message: "We couldn't delete your account. Try again in a minute.",
    };
  }
  if (board) {
    return {
      status: "error",
      message:
        "You also run a board with this account. Close it first from Manage my board, then delete your account.",
    };
  }

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
