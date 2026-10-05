import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { TILES_BUCKET } from "@/app/b/[slug]/tiles";
import {
  deletionDate,
  type DownloadableTile,
  type DownloadDeps,
  type MyDrawing,
} from "./my-drawings";

/** Plenty for one person: at most one post per board per day. */
const LIMIT = 500;

type Row = {
  id: string;
  caption: string | null;
  image_path: string;
  created_at: string;
  weeks: {
    voting_ends_at: string;
    venues: { name: string; slug: string };
  };
};

/**
 * The account's drawings still on a board, newest first, with how long each
 * one is kept.
 *
 * @param admin - A service-role client; `user_id` filters are ours, never
 * the request's.
 */
export async function listMyDrawings(
  admin: SupabaseClient,
  userId: string,
): Promise<MyDrawing[]> {
  const [{ data, error }, { data: winners, error: winnersError }] =
    await Promise.all([
      admin
        .from("tiles")
        .select(
          "id, caption, image_path, created_at, weeks!inner(voting_ends_at, venues!inner(name, slug))",
        )
        .eq("user_id", userId)
        .eq("status", "live")
        .order("created_at", { ascending: false })
        .limit(LIMIT)
        .returns<Row[]>(),
      admin.rpc("account_winning_tile_ids", { p_user_id: userId }),
    ]);

  if (error) throw new Error(`listMyDrawings: ${error.message}`);
  if (winnersError) throw new Error(`listMyDrawings: ${winnersError.message}`);

  const kept = new Set<string>((winners ?? []) as string[]);
  const storage = admin.storage.from(TILES_BUCKET);
  return data.map((row) => {
    const isWinner = kept.has(row.id);
    return {
      id: row.id,
      boardName: row.weeks.venues.name,
      boardSlug: row.weeks.venues.slug,
      caption: row.caption,
      imageUrl: storage.getPublicUrl(row.image_path).data.publicUrl,
      postedAt: row.created_at,
      isWinner,
      deletedAfter: isWinner
        ? null
        : deletionDate(row.weeks.voting_ends_at).toISOString(),
    };
  });
}

/** {@link DownloadDeps} backed by Supabase and sharp. */
export function supabaseDownloadDeps(admin: SupabaseClient): DownloadDeps {
  return {
    async findOwnTile(tileId, userId): Promise<DownloadableTile | null> {
      const { data, error } = await admin
        .from("tiles")
        .select("image_path, created_at, weeks!inner(venues!inner(slug))")
        .eq("id", tileId)
        .eq("user_id", userId)
        .eq("status", "live")
        .maybeSingle<{
          image_path: string;
          created_at: string;
          weeks: { venues: { slug: string } };
        }>();

      if (error) throw new Error(`findOwnTile: ${error.message}`);
      return data
        ? {
            imagePath: data.image_path,
            boardSlug: data.weeks.venues.slug,
            postedAt: data.created_at,
          }
        : null;
    },

    async readImage(path) {
      const { data, error } = await admin.storage
        .from(TILES_BUCKET)
        .download(path);
      if (error) throw new Error(`readImage: ${error.message}`);
      return Buffer.from(await data.arrayBuffer());
    },

    toPng: (image) => sharp(image).png().toBuffer(),
  };
}
