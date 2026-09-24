/** The subset of a Postgres error returned by supabase-js that this needs. */
type UpdateError = { message: string };

export type UpdateVenueName = (
  name: string,
) => Promise<{ error: UpdateError | null }>;

export type RenameResult = "renamed" | "unchanged";

/**
 * Changes a venue's display name.
 *
 * The slug is not recomputed. It is generated once at setup and stored, the
 * QR code encodes `/b/<slug>`, and the daily join code is keyed by venue and
 * time window — so a rename reprints nothing (issue #105). Changing the slug
 * is a separate feature that needs somewhere to keep former slugs, or every
 * printed code dies at once.
 *
 * @returns `"unchanged"` when the name is already what was asked for, so a
 * double-submitted form costs no write and no log line.
 * @throws {Error} On any database error.
 */
export async function renameVenue(
  currentName: string,
  newName: string,
  update: UpdateVenueName,
): Promise<RenameResult> {
  if (currentName === newName) return "unchanged";

  const { error } = await update(newName);
  if (error) throw new Error(`Could not rename venue: ${error.message}`);

  return "renamed";
}
