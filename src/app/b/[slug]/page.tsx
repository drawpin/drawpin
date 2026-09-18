import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountBar } from "@/components/account-bar";
import { buttonVariants } from "@/components/ui/button";
import { connection } from "next/server";
import { getCustomer } from "@/lib/customer";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBoard, getPostingWeek, listLiveTiles } from "./data";
import { TileFeed } from "./tile-feed";

export async function generateMetadata({
  params,
}: PageProps<"/b/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const board = await getBoard(slug);
  return {
    title: board ? `${board.name} · DrawPin` : "Board not found · DrawPin",
  };
}

export default async function BoardPage({ params }: PageProps<"/b/[slug]">) {
  // Always render per request: the feed changes whenever someone posts.
  await connection();

  const { slug } = await params;
  const board = await getBoard(slug);
  if (!board) notFound();

  const week = await getPostingWeek(board.id);
  const page = week ? await listLiveTiles(week.id) : null;
  const customer = await getCustomer(createAdminClient());

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{board.name}</h1>
        {!board.isPaused && (
          <Link href={`/b/${slug}/draw`} className={buttonVariants()}>
            Draw a tile
          </Link>
        )}
      </div>

      {board.isPaused && (
        <p role="status" className="bg-muted rounded-lg px-3 py-2 text-sm">
          This board is paused. You can look around, but new posts are off for
          now.
        </p>
      )}

      <AccountBar customer={customer} next={`/b/${slug}`} />

      <TileFeed
        // Tiles and the pagination cursor belong to one week; start fresh when
        // the board moves on to a new one.
        key={week?.id ?? "no-week"}
        venueId={board.id}
        weekId={week?.id ?? null}
        postingEndsAt={week?.postingEndsAt ?? null}
        initialTiles={page?.tiles ?? []}
        initialCursor={page?.nextCursor ?? null}
      />
    </main>
  );
}
