"use server";

import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/customer";
import { deleteAccount } from "@/lib/delete-account";
import { ownedBoardCount } from "@/lib/my-boards";
import { supabaseMyBoardsStore } from "@/lib/supabase-my-boards";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SupabaseDeleteAccountStore } from "@/lib/supabase-delete-account-store";

export type DeleteAccountState =
  { status: "idle" } | { status: "error"; message: string };

const OWNS_BOARDS_MESSAGE =
  "You also run boards with this account. Close them first from Manage my board, then delete your account.";

/**
 * Deletes the signed-in customer's DrawPin account, then signs them out
 * (docs/PLAN.md, Accounts).
 *
 * One account can draw and own boards (ADR-013, ADR-016), and deleting the
 * sign-in would take every board with it (the owner row cascades from it).
 * So an account that owns any board is asked to close them first, from the
 * owner screen (ADR-009), rather than losing them here by surprise.
 */
export async function deleteAccountAction(): Promise<DeleteAccountState> {
  const admin = createAdminClient();
  const customer = await getCustomer(admin);
  if (!customer) redirect("/");

  let boards: number;
  try {
    boards = await ownedBoardCount(customer.id, supabaseMyBoardsStore(admin));
  } catch (error) {
    console.error("deleteAccountAction: board check failed", error);
    return {
      status: "error",
      message: "We couldn't delete your account. Try again in a minute.",
    };
  }
  if (boards > 0) return { status: "error", message: OWNS_BOARDS_MESSAGE };

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
