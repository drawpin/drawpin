import { isAuthSessionMissingError, type User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns the signed-in owner, or `null` if nobody is signed in.
 *
 * @throws {Error} If Supabase couldn't be reached, so an outage surfaces as an
 * error instead of silently looking like a signed-out owner.
 */
export async function getOwner(): Promise<User | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error && !isAuthSessionMissingError(error)) {
    // An expired or revoked token is just "signed out"; anything else isn't.
    if (error.status === 401 || error.status === 403) return null;
    throw new Error(`Could not check the owner session: ${error.message}`);
  }

  return data.user;
}

/**
 * Whether this account came through the owner flow.
 *
 * Owners sign in by email magic link and customers with Google (ADR-004), so
 * the provider is what separates them. Without this, any signed-in customer
 * could open `/setup` and create a venue.
 */
export function isOwnerAccount(user: User): boolean {
  const metadata = user.app_metadata as {
    provider?: string;
    providers?: string[];
  };
  const providers = metadata.providers ?? [metadata.provider];
  return providers.includes("email");
}

/**
 * Returns the signed-in owner, redirecting to `/login` if there isn't one.
 * Use at the top of every owner-only page and Server Action.
 */
export async function requireOwner(): Promise<User> {
  const owner = await getOwner();
  if (!owner) redirect("/login");
  return owner;
}
