import type { Metadata } from "next";
import { connection } from "next/server";
import { getCustomer } from "@/lib/customer";
import { readDeviceId } from "@/lib/device";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDayFor } from "@/lib/venue-time";
import { getBoard, requireBoard } from "../data";
import { sharePreview } from "../share-preview";
import { BackToBoard } from "./back-to-board";
import { DrawTileForm } from "./draw-tile-form";
import { BLOCKED_ATTEMPT_LIMIT } from "./post-tile";

export async function generateMetadata({
  params,
}: PageProps<"/b/[slug]/draw">): Promise<Metadata> {
  const { slug } = await params;
  const board = await getBoard(slug);
  return {
    title: board ? `Draw a tile · ${board.name}` : "Board not found · DrawPin",
    openGraph: board ? sharePreview("draw", board) : undefined,
  };
}

/**
 * Why this device can't post today, if it can't: it already posted, or
 * moderation blocked it too many times. Only a convenience so the visitor
 * isn't asked to draw for nothing; the Server Action enforces both limits.
 */
async function todaysBlocker(board: {
  id: string;
  timezone: string;
}): Promise<string | null> {
  const deviceId = await readDeviceId();
  if (!deviceId) return null;

  const { data, error } = await createAdminClient()
    .from("post_attempts")
    .select("has_posted, blocked_count")
    .match({
      venue_id: board.id,
      device_id: deviceId,
      local_day: localDayFor(new Date(), board.timezone),
    })
    .maybeSingle();

  if (error) throw new Error(`Could not check today's post: ${error.message}`);
  if (!data) return null;

  if (data.blocked_count >= BLOCKED_ATTEMPT_LIMIT) {
    return "Too many posts couldn't be posted today. You can try again after 4:00 AM.";
  }
  if (data.has_posted) {
    return "You've already posted today. You can post again after 4:00 AM.";
  }
  return null;
}

export default async function DrawPage({
  params,
}: PageProps<"/b/[slug]/draw">) {
  await connection();

  const { slug } = await params;
  const board = await requireBoard(slug, "/draw");

  const customer = await getCustomer(createAdminClient());
  // A guest never posts, so today's limits don't stop them drawing for fun.
  const blocked = board.isPaused
    ? "This board is paused, so posting is off right now."
    : customer
      ? await todaysBlocker(board)
      : null;

  return (
    // White, like every page; the canvas and tools carry the ink outline.
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
        {/* Back first, where a phone's back button is expected; it asks
          before leaving a drawing behind. */}
        <div className="flex items-center gap-3">
          <BackToBoard href={`/b/${slug}`} />
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight">
              Draw a tile
            </h1>
            <p className="text-muted-foreground truncate text-sm">
              {board.name}
            </p>
          </div>
        </div>

        {blocked ? (
          <p
            role="status"
            className="bg-secondary rounded-2xl px-4 py-3 text-sm"
          >
            {blocked}
          </p>
        ) : (
          <>
            <DrawTileForm
              slug={slug}
              turnstileSiteKey={serverEnv().NEXT_PUBLIC_TURNSTILE_SITE_KEY}
              username={customer?.username ?? null}
            />
          </>
        )}
      </main>
    </div>
  );
}
