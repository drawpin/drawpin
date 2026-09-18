/** The subset of a Postgres error returned by supabase-js that this needs. */
type UpsertError = { message: string };

export type UpsertOwner = (row: {
  id: string;
  email: string;
}) => Promise<{ error: UpsertError | null }>;

/**
 * Makes sure the signed-in person has an `owners` row before their venue is
 * created, since `venues.owner_id` references it.
 *
 * Signing in no longer creates one (ADR-004: customers sign in too, and they
 * aren't owners), so this is the moment it appears. It's idempotent, because
 * an owner whose first venue insert failed will come back and try again.
 *
 * @throws {Error} If the row couldn't be written.
 */
export async function ensureOwnerRow(
  user: { id: string; email?: string },
  upsert: UpsertOwner,
): Promise<void> {
  const { error } = await upsert({ id: user.id, email: user.email ?? "" });
  if (error) throw new Error(`Could not create owner: ${error.message}`);
}
