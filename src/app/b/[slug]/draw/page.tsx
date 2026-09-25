import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getCustomer } from "@/lib/customer";
import { readDeviceId } from "@/lib/device";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDayFor } from "@/lib/venue-time";
import { getBoard } from "../data";
import { DrawTileForm } from "./draw-tile-form";
import { BLOCKED_ATTEMPT_LIMIT } from "./post-tile";
import { SignInFirst } from "./sign-in-first";

export async function generateMetadata({
  params,
}: PageProps<"/b/[slug]/draw">): Promise<Metadata> {
  const { slug } = await params;
  const board = await getBoard(slug);
  return {
    title: board ? `Draw a tile · ${board.name}` : "Board not found · DrawPin",
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
  const board = await getBoard(slug);
  if (!board) notFound();

  const backLink = (
    <Link href={`/b/${slug}`} className="text-sm underline underline-offset-4">
      Back to the board
    </Link>
  );

  const customer = await getCustomer(createAdminClient());
  const blocked = board.isPaused
    ? "This board is paused, so posting is off right now."
    : await todaysBlocker(board);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Draw a tile</h1>
        {backLink}
      </div>
      <p className="text-muted-foreground text-sm">{board.name}</p>

      {blocked ? (
        <p role="status" className="bg-muted rounded-lg px-3 py-2 text-sm">
          {blocked}
        </p>
      ) : (
        <>
          {!customer && <SignInFirst next={`/b/${slug}/draw`} />}
          <DrawTileForm
            slug={slug}
            turnstileSiteKey={serverEnv().NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            username={customer?.username ?? null}
          />
        </>
      )}
    </main>
  );
}
