import {
  isAuthSessionMissingError,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
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
 * Whether this account has signed in with an emailed code or link.
 *
 * Owners can only sign in that way, so an account without it (Google only)
 * is a customer's. Customers can sign in by email too since ADR-010, so this
 * alone doesn't make anyone an owner: see {@link classifyAccount}.
 */
export function signedInByEmail(user: User): boolean {
  const metadata = user.app_metadata as {
    provider?: string;
    providers?: string[];
  };
  const providers = metadata.providers ?? [metadata.provider];
  return providers.includes("email");
}

/**
 * What a signed-in account is for.
 *
 * - `owner`: it owns a board, or has started setting one up.
 * - `customer`: it draws, votes and reports on boards.
 * - `new`: it signed in by email and hasn't become either yet. That's an
 *   owner who hasn't set up a board, or a customer who hasn't picked a
 *   username; nothing tells them apart until they do.
 */
export type AccountKind = "owner" | "customer" | "new";

/**
 * Decides what an account is for from the rows it has.
 *
 * An account is an owner or a customer, never both (ADR-004), and the data
 * records which: an `owners` row (written when a board is set up) or a
 * `profiles` row (written when a customer picks a username). The sign-in
 * method only matters for an account with neither, and only one way: a
 * Google-only account is a customer's, since owners sign in by email.
 */
export function classifyAccount(account: {
  hasOwnerRow: boolean;
  hasProfile: boolean;
  signedInByEmail: boolean;
}): AccountKind {
  // Checked first so an owner always reaches their board, including an
  // account the old provider-only check let end up with both rows.
  if (account.hasOwnerRow) return "owner";
  if (account.hasProfile) return "customer";
  return account.signedInByEmail ? "new" : "customer";
}

/** A signed-in account, as the owner pages need to know it. */
export type Account = {
  kind: AccountKind;
  /** The customer's username, if they've picked one. */
  username: string | null;
};

/**
 * Looks up what the signed-in account is for (see {@link classifyAccount}).
 *
 * @param admin - A service-role client: `owners` is readable only by its
 * own row's account, and this works the same either way.
 * @throws {Error} If either lookup fails.
 */
export async function getAccount(
  user: User,
  admin: SupabaseClient,
): Promise<Account> {
  const [owner, profile] = await Promise.all([
    admin.from("owners").select("id").eq("id", user.id).maybeSingle(),
    admin
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle<{ username: string }>(),
  ]);

  if (owner.error) {
    throw new Error(`Could not load owner: ${owner.error.message}`);
  }
  if (profile.error) {
    throw new Error(`Could not load profile: ${profile.error.message}`);
  }

  return {
    kind: classifyAccount({
      hasOwnerRow: owner.data !== null,
      hasProfile: profile.data !== null,
      signedInByEmail: signedInByEmail(user),
    }),
    username: profile.data?.username ?? null,
  };
}

/**
 * Where `/login` sends an account that's already signed in, or `null` to
 * show the owner sign-in form. A customer gets the form, since signing in
 * there with a board's email is how they switch to it.
 */
export function signedInLoginDestination(
  kind: AccountKind,
): "/admin" | "/setup" | null {
  switch (kind) {
    case "owner":
      return "/admin";
    case "new":
      return "/setup";
    case "customer":
      return null;
  }
}

/**
 * Whether this account may set up a board. Anything but a customer's: a
 * customer who could would end up both, which ADR-004 rules out.
 */
export function canSetUpBoard(kind: AccountKind): boolean {
  return kind !== "customer";
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
