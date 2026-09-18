"use server";

import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/next-path";
import { createClient } from "@/lib/supabase/server";

/** Signs a customer out and leaves them on the page they were reading. */
export async function signOutCustomer(formData: FormData) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const next = formData.get("next");
  redirect(safeNextPath(typeof next === "string" ? next : null));
}
