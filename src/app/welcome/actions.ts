"use server";

import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { safeNextPath } from "@/lib/next-path";
import { createAdminClient } from "@/lib/supabase/admin";
import { usernameProblem } from "./check-username";
import { type WelcomeState, usernameSchema } from "./schema";

/** Saves the username a new customer picked, then returns them to the board. */
export async function chooseUsername(
  _previous: WelcomeState,
  formData: FormData,
): Promise<WelcomeState> {
  const user = await requireOwner("/");

  const parsed = usernameSchema.safeParse({
    username: formData.get("username"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  const { username } = parsed.data;
  const problem = await usernameProblem(username);
  if (problem) return { status: "error", message: problem };

  const { error } = await createAdminClient()
    .from("profiles")
    .upsert({ id: user.id, username }, { onConflict: "id" });

  if (error) {
    console.error("Could not save the profile", error);
    return {
      status: "error",
      message: "We couldn't save that name. Try again in a moment.",
    };
  }

  redirect(safeNextPath(formData.get("next") as string | null));
}
