"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Signs the owner out on this device and returns them to the login page. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(`Could not sign out: ${error.message}`);
  redirect("/login");
}
