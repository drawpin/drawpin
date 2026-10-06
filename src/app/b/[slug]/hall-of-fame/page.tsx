import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeftIcon, TrophyIcon } from "@phosphor-icons/react/ssr";
import { connection } from "next/server";
import { hand } from "@/lib/fonts";
import { createAdminClient } from "@/lib/supabase/admin";
import { BoardLayout, HEADER_BUTTON, YELLOW_STRIP } from "../board-look";
import { getBoard, requireBoard } from "../data";
import { PinnedDrawing } from "../pinned-drawing";
import { sharePreview } from "../share-preview";
import type { Tile } from "../tiles";
import { DrawingsList } from "../vote/drawings-list";
import { listSuperWinners, listWinners } from "./data";

/** A winner whose account has since been deleted keeps its place, unnamed. */
const FORMER_MEMBER = "A former member";

export async function generateMetadata({
  params,
}: PageProps<"/b/[slug]/hall-of-fame">): Promise<Metadata> {
  const { slug } = await params;
  const board = await getBoard(slug);
  return {
    title: board ? `Hall of Fame · ${board.name}` : "Board not found · DrawPin",
    openGraph: board ? sharePreview("hall-of-fame", board) : undefined,
  };
}

/** "September 2026", from the first day of the month judged. */
function monthLabel(month: string): string {
  return new Date(`${month}T12:00:00Z`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

/** "14 September 2026", from the Monday the week began. */
function weekLabel(startsAt: string): string {
  return new Date(startsAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** A winner as the shared polaroid wants it: a tile, never the viewer's own. */
function asTile(
  id: string,
  winner: { author: string | null; caption: string | null; imageUrl: string },
): Tile {
  return {
    id,
    author: winner.author ?? FORMER_MEMBER,
    caption: winner.caption,
    isGuest: false,
    isOwn: false,
    imageUrl: winner.imageUrl,
    createdAt: "",
  };
}

/** The gold trophy (Canva, like the podium's), on a winner's corner. */
function TrophyBadge({ size }: { size: number }) {
  return (
    <Image
      src="/trophies/gold.webp"
      alt=""
      width={size}
      height={size}
      // Already a small WebP file (public/trophies).
      unoptimized
      className="absolute -right-3 -bottom-3 rotate-6 drop-shadow-[2px_2px_0_rgb(15_27_45/0.25)]"
    />
  );
}

/**
 * The board's winners, kept forever (docs/PLAN.md): each month's super
 * winner, then every week's winner, newest first. In the board's look (UI
 * pass, 2026-10-05): the blue header, and the winning drawings pinned up as
 * polaroids, each with a gold trophy on its corner.
 */
export default async function HallOfFamePage({
  params,
}: PageProps<"/b/[slug]/hall-of-fame">) {
  // A week can close while this page is being served.
  await connection();

  const { slug } = await params;
  const board = await requireBoard(slug, "/hall-of-fame");

  const admin = createAdminClient();
  const [winners, superWinners] = await Promise.all([
    listWinners(admin, board.id),
    listSuperWinners(admin, board.id, board.timezone),
  ]);
  const total = winners.length + superWinners.length;

  return (
    <BoardLayout
      header={
        <>
          {total > 0 && (
            <p
              className={`${hand.className} bg-winner text-foreground w-fit -rotate-2 rounded-sm px-2.5 py-0.5 text-xl leading-tight font-bold`}
            >
              {winners.length} {winners.length === 1 ? "winner" : "winners"} so
              far!
            </p>
          )}
          <div className="flex flex-col gap-1">
            <h1 className="flex items-center gap-2 text-4xl leading-[1.02] font-black tracking-tight">
              <TrophyIcon weight="fill" className="text-winner size-9" />
              Hall of Fame
            </h1>
            <p className="text-sm text-white/80">{board.name}</p>
          </div>
          <Link href={`/b/${slug}`} className={`${HEADER_BUTTON} w-fit`}>
            <ArrowLeftIcon weight="bold" className="size-5" />
            Back to the board
          </Link>
        </>
      }
    >
      {superWinners.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className={`${YELLOW_STRIP} text-3xl`}>Super winners</h2>
          <ul className="grid gap-12 pt-8 sm:grid-cols-2 lg:grid-cols-3">
            {superWinners.map((winner, index) => (
              <li key={winner.month} className="board-sway flex flex-col gap-3">
                <p className="text-primary text-sm font-bold">
                  {monthLabel(winner.month)}
                  <span className="text-muted-foreground font-semibold">
                    {" · "}
                    {/* A month with one finalist crowns it without a vote,
                        and "0 votes" reads like something went wrong. */}
                    {winner.voteCount === 0
                      ? "unopposed"
                      : `${winner.voteCount} ${winner.voteCount === 1 ? "vote" : "votes"} in the final`}
                  </span>
                </p>
                <div className="mx-auto w-[88%] sm:w-full">
                  <PinnedDrawing
                    tile={asTile(`super-${winner.month}`, winner)}
                    index={index}
                    badge={<TrophyBadge size={64} />}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {winners.length === 0 ? (
        <p role="status" className={`${YELLOW_STRIP} text-2xl leading-tight`}>
          No winners yet. The first one is crowned when a week&apos;s voting
          closes.
        </p>
      ) : (
        <section className="flex flex-col gap-4">
          <h2 className={`${YELLOW_STRIP} text-3xl`}>Weekly winners</h2>
          <DrawingsList>
            {winners.map((winner, index) => (
              <div key={winner.weekId} className="flex flex-col gap-5">
                <PinnedDrawing
                  tile={asTile(winner.weekId, winner)}
                  index={index}
                  badge={<TrophyBadge size={40} />}
                />
                <p className="px-1 text-xs font-semibold">
                  <span className="text-foreground block">
                    Week of {weekLabel(winner.weekStartsAt)}
                  </span>
                  <span className="text-muted-foreground">
                    {winner.voteCount}{" "}
                    {winner.voteCount === 1 ? "vote" : "votes"}
                  </span>
                </p>
              </div>
            ))}
          </DrawingsList>
        </section>
      )}
    </BoardLayout>
  );
}
