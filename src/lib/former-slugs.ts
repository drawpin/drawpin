import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Follows a slug a board used to have to the slug it has now (ADR-008). A
 * board's old slugs are printed under every QR code it has ever had, so they
 * keep working for good.
 *
 * @param client - Any Supabase client: `former_slugs` is publicly readable.
 * @returns The board's current slug, or `null` if no board ever had `slug`.
 */
export async function findMovedSlug(
  client: SupabaseClient,
  slug: string,
): Promise<string | null> {
  const { data, error } = await client
    .from("former_slugs")
    .select("venues!inner(slug)")
    .eq("slug", slug)
    .maybeSingle<{ venues: { slug: string } }>();

  if (error)
    throw new Error(`Could not follow a former slug: ${error.message}`);
  return data?.venues.slug ?? null;
}
