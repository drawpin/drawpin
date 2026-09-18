import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBoard } from "../data";
import { listSuperWinners, listWinners } from "./data";

export async function generateMetadata({
  params,
}: PageProps<"/b/[slug]/hall-of-fame">): Promise<Metadata> {
  const { slug } = await params;
  const board = await getBoard(slug);
  return {
    title: board ? `Hall of Fame · ${board.name}` : "Board not found · DrawPin",
  };
}

/** "September 2026", from the first day of the month judged. */
function monthLabel(month: string): string {
  return new Date(`${month}T12:00:00Z`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

/** "Week of 14 September 2026", from the Monday the week began. */
function weekLabel(startsAt: string): string {
  return new Date(startsAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function HallOfFamePage({
  params,
}: PageProps<"/b/[slug]/hall-of-fame">) {
  // A week can close while this page is being served.
  await connection();

  const { slug } = await params;
  const board = await getBoard(slug);
  if (!board) notFound();

  const admin = createAdminClient();
  const winners = await listWinners(admin, board.id);
  const superWinners = await listSuperWinners(admin, board.id, board.timezone);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Hall of Fame</h1>
        <Link
          href={`/b/${slug}`}
          className="text-sm underline underline-offset-4"
        >
          Back to the board
        </Link>
      </div>
      <p className="text-muted-foreground text-sm">{board.name}</p>

      {superWinners.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Super winners
          </h2>
          <ul className="flex flex-col gap-6">
            {superWinners.map((winner) => (
              <li key={winner.month} className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">
                  {monthLabel(winner.month)}
                </h3>
                <Image
                  src={winner.imageUrl}
                  alt={
                    winner.caption ??
                    `Super winning drawing by ${winner.author}`
                  }
                  width={768}
                  height={768}
                  unoptimized
                  className="aspect-square w-full rounded-lg border-2 bg-white object-cover"
                />
                {winner.caption && (
                  <p className="text-sm break-words">{winner.caption}</p>
                )}
                <p className="text-muted-foreground text-xs">
                  {winner.author} · {winner.voteCount}{" "}
                  {winner.voteCount === 1 ? "vote" : "votes"} in the final
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {superWinners.length > 0 && winners.length > 0 && (
        <h2 className="text-lg font-semibold tracking-tight">Weekly winners</h2>
      )}

      {winners.length === 0 ? (
        <p role="status" className="bg-muted rounded-lg px-3 py-2 text-sm">
          No winners yet. The first one is crowned when a week&apos;s voting
          closes.
        </p>
      ) : (
        <ul className="flex flex-col gap-6">
          {winners.map((winner) => (
            <li key={winner.weekId} className="flex flex-col gap-2">
              <h2 className="text-sm font-medium">
                Week of {weekLabel(winner.weekStartsAt)}
              </h2>
              <Image
                src={winner.imageUrl}
                alt={winner.caption ?? `Winning drawing by ${winner.author}`}
                width={768}
                height={768}
                unoptimized
                className="aspect-square w-full rounded-lg border bg-white object-cover"
              />
              {winner.caption && (
                <p className="text-sm break-words">{winner.caption}</p>
              )}
              <p className="text-muted-foreground text-xs">
                {winner.author} · {winner.voteCount}{" "}
                {winner.voteCount === 1 ? "vote" : "votes"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
