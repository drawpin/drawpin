import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getBoard, getPostingWeekId, listLiveTiles } from "./data";
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

  const weekId = await getPostingWeekId(board.id);
  const page = weekId ? await listLiveTiles(weekId) : null;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">{board.name}</h1>

      {board.isPaused && (
        <p role="status" className="bg-muted rounded-lg px-3 py-2 text-sm">
          This board is paused. You can look around, but new posts are off for
          now.
        </p>
      )}

      {weekId && page && page.tiles.length > 0 ? (
        <TileFeed
          weekId={weekId}
          initialTiles={page.tiles}
          initialCursor={page.nextCursor}
        />
      ) : (
        <p className="text-muted-foreground py-12 text-center">
          No drawings yet this week.
        </p>
      )}
    </main>
  );
}
