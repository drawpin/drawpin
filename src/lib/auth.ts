import { isAuthSessionMissingError, type User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in account's id, read from its session token, or `null` if
 * nobody is signed in or the token doesn't check out.
 *
 * Quicker than {@link getOwner}: the project signs tokens with a key pair
 * (ES256), so `getClaims` checks the signature here against the published
 * public key instead of asking the auth server on every request. The cost is
 * that a session signed out elsewhere still reads as signed in until its
 * token expires (an hour at most), so this is for showing pages only. Anything
 * that changes data goes through {@link getOwner}.
 */
export async function getSignedInUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error) {
    // An expired or tampered token is just "signed out"; anything else is
    // worth knowing about, but a page still shows as for a guest.
    if (!isAuthSessionMissingError(error)) {
      console.error("Could not check the session token", error.message);
    }
    return null;
  }
  return data?.claims.sub ?? null;
}

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
