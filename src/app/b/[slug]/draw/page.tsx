import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { MODERATION_LEVEL_INFO } from "@/lib/moderation/levels";
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
 * Why this account can't post today, if it can't: it already posted here, or
 * moderation blocked this device too many times. Only a convenience so the
 * visitor isn't asked to draw for nothing; the Server Action enforces both
 * limits.
 */
async function todaysBlocker(
  board: { id: string; timezone: string },
  userId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const localDay = localDayFor(new Date(), board.timezone);
  const deviceId = await readDeviceId();

  const [posted, attempts] = await Promise.all([
    admin
      .from("account_posts")
      .select("user_id")
      .match({ venue_id: board.id, user_id: userId, local_day: localDay })
      .maybeSingle(),
    deviceId
      ? admin
          .from("post_attempts")
          .select("blocked_count")
          .match({
            venue_id: board.id,
            device_id: deviceId,
            local_day: localDay,
          })
          .maybeSingle()
      : null,
  ]);

  if (posted.error) {
    throw new Error(`Could not check today's post: ${posted.error.message}`);
  }
  if (attempts?.error) {
    throw new Error(`Could not check today's post: ${attempts.error.message}`);
  }

  if ((attempts?.data?.blocked_count ?? 0) >= BLOCKED_ATTEMPT_LIMIT) {
    return "Too many posts couldn't be posted today. You can try again after 4:00 AM.";
  }
  if (posted.data) {
    return "You've already posted today. You can post again after 4:00 AM.";
  }
  return null;
}

export default async function DrawPage({
  params,
}: PageProps<"/b/[slug]/draw">) {
  await connection();

  const { slug } = await params;
  // The board and who's looking don't depend on each other: read both at once.
  const [board, customer] = await Promise.all([
    requireBoard(slug, "/draw"),
    getCustomer(createAdminClient(), { check: "token" }),
  ]);
  // A guest never posts, so today's limits don't stop them drawing for fun.
  const blocked = board.isPaused
    ? "This board is paused, so posting is off right now."
    : customer
      ? await todaysBlocker(board, customer.id)
      : null;
  const { drawNote } = MODERATION_LEVEL_INFO[board.moderationLevel];

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

        {/* Only on a board that allows more than All Ages, so someone
            drawing knows what may sit beside their tile (ADR-012). */}
        {drawNote && (
          <p className="text-muted-foreground text-center text-xs">
            {drawNote}{" "}
            <Link
              href={`/b/${board.slug}/rules`}
              className="hover:text-foreground underline underline-offset-4"
            >
              Board rules
            </Link>
          </p>
        )}
      </main>
    </div>
  );
}
