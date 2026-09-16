import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { readDeviceId } from "@/lib/device";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDayFor } from "@/lib/venue-time";
import { getBoard } from "../data";
import { DrawTileForm } from "./draw-tile-form";

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
 * Whether this device has already used today's post on the board. Only a
 * convenience so the visitor isn't asked to draw for nothing; the Server
 * Action enforces the limit.
 */
async function hasPostedToday(board: { id: string; timezone: string }) {
  const deviceId = await readDeviceId();
  if (!deviceId) return false;

  const { data, error } = await createAdminClient()
    .from("post_attempts")
    .select("has_posted")
    .match({
      venue_id: board.id,
      device_id: deviceId,
      local_day: localDayFor(new Date(), board.timezone),
    })
    .maybeSingle();

  if (error) throw new Error(`Could not check today's post: ${error.message}`);
  return data?.has_posted ?? false;
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

  let blocked: string | null = null;
  if (board.isPaused) {
    blocked = "This board is paused, so posting is off right now.";
  } else if (await hasPostedToday(board)) {
    blocked = "You've already posted today. You can post again after 4:00 AM.";
  }

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
        <DrawTileForm slug={slug} />
      )}
    </main>
  );
}
