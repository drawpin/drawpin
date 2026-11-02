"use server";

import { revalidatePath } from "next/cache";
import { getCustomer } from "@/lib/customer";
import { changeUsername, type ChangeNameState } from "@/lib/change-username";
import { createAdminClient } from "@/lib/supabase/admin";
import { usernameProblem } from "../welcome/check-username";

/** Changes the signed-in account's username from the profile header. */
export async function changeName(
  _previous: ChangeNameState,
  formData: FormData,
): Promise<ChangeNameState> {
  const admin = createAdminClient();
  const customer = await getCustomer(admin);
  if (!customer) {
    return { status: "error", message: "Sign in again to change your name." };
  }

  const result = await changeUsername(
    formData.get("username"),
    customer.username,
    {
      problem: usernameProblem,
      async save(username) {
        const { error } = await admin
          .from("profiles")
          .update({ username })
          .eq("id", customer.id);
        if (error) throw new Error(error.message);
      },
    },
  );

  if (result.status === "saved") revalidatePath("/me");
  return result;
}
