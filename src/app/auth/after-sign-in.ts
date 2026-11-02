import { signInDestination } from "@/lib/sign-in-routing";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Where a just-signed-in account goes next: the page it asked to come back
 * to, or `/welcome` to pick a drawing name first if it hasn't got one yet.
 * Every way in (Google, the emailed code, the emailed link) ends here, so
 * they all land the same (ADR-010, ADR-013).
 *
 * @param userId - The account that just signed in.
 * @param next - The `next` it carried, as received; validated here.
 * @param fallback - Where to go when there's no usable `next`.
 */
export async function destinationAfterSignIn(
  userId: string,
  next: string | null,
  fallback = "/",
): Promise<string> {
  const { data: profile, error } = await createAdminClient()
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(`Could not load profile: ${error.message}`);
  return signInDestination({ next, hasProfile: Boolean(profile), fallback });
}
