import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { GoogleSignIn } from "@/components/google-sign-in";
import { getCustomer } from "@/lib/customer";
import { serverEnv } from "@/lib/env";
import { hand } from "@/lib/fonts";
import { createAdminClient } from "@/lib/supabase/admin";
import { weekdayFor } from "@/lib/venue-time";
import { BoardLayout, HEADER_BUTTON, YELLOW_STRIP } from "../board-look";
import { getBoard, getLiveTiles, getVotingWeek, listLiveTiles } from "../data";
import { VOTES_PER_WEEK } from "./cast-votes";
import { type Leader, Podium } from "./podium";
import { rankPodium } from "./rank-podium";
import { SupabaseVoteStore } from "./supabase-vote-store";
import { TileWall } from "./tile-wall";
import { VoteGrid } from "./vote-grid";

export async function generateMetadata({
  params,
}: PageProps<"/b/[slug]/vote">): Promise<Metadata> {
  const { slug } = await params;
  const board = await getBoard(slug);
  return {
    title: board ? `Vote · ${board.name}` : "Board not found · DrawPin",
  };
}

/** The phone's status bar matches the blue header, as on the board. */
export const viewport: Viewport = { themeColor: "#004aad" };

/**
 * Voting on last week's board, in the board's look (UI pass, 2026-10-03):
 * the blue header, the live top-3 podium (ADR-008), and last week's drawings
 * as pinned polaroids to pick from.
 */
export default async function VotePage({
  params,
}: PageProps<"/b/[slug]/vote">) {
  // Votes change while the page is open, so never serve a cached copy.
  await connection();

  const { slug } = await params;
  const board = await getBoard(slug);
  if (!board) notFound();

  const week = await getVotingWeek(board.id);
  const admin = createAdminClient();
  const customer = await getCustomer(admin);

  const store = new SupabaseVoteStore(admin);
  const votedTileIds =
    week && customer ? await store.listVotedTileIds(week.id, customer.id) : [];
  const votesLeft = VOTES_PER_WEEK - votedTileIds.length;

  // The note above the title: what this visitor can do this week.
  const note = !week
    ? null
    : !customer
      ? "Sign in to vote!"
      : votesLeft === 0
        ? "All your votes are in!"
        : `${votesLeft} ${votesLeft === 1 ? "vote" : "votes"} left!`;

  const header = (
    <>
      {note && (
        <p
          className={`${hand.className} bg-winner text-foreground w-fit -rotate-2 rounded-sm px-2.5 py-0.5 text-xl leading-tight font-bold`}
        >
          {note}
        </p>
      )}
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl leading-[1.02] font-black tracking-tight">
          Vote for last week&apos;s best
        </h1>
        <p className="text-sm text-white/80">
          {board.name}
          {week &&
            ` · closes ${weekdayFor(new Date(week.votingEndsAt), board.timezone)}`}
        </p>
      </div>
      <Link href={`/b/${slug}`} className={`${HEADER_BUTTON} w-fit`}>
        <ArrowLeftIcon weight="bold" className="size-5" />
        Back to the board
      </Link>
    </>
  );

  if (!week) {
    return (
      <BoardLayout header={header}>
        <p role="status" className={`${YELLOW_STRIP} text-2xl leading-tight`}>
          Voting isn&apos;t open on this board right now. Last week&apos;s
          drawings go up for voting every Monday at 4:00 AM.
        </p>
      </BoardLayout>
    );
  }

  const page = await listLiveTiles(
    week.id,
    undefined,
    undefined,
    customer?.id ?? null,
  );

  // The live podium: counts are public while voting is open (ADR-008).
  const places = rankPodium(await store.listCastVotes(week.id));
  const leaderTiles = await getLiveTiles(
    places.map((place) => place.tileId),
    undefined,
    customer?.id ?? null,
  );
  const leaders = places.flatMap((place, index): Leader[] => {
    const tile = leaderTiles.find((candidate) => candidate.id === place.tileId);
    return tile
      ? [{ place: (index + 1) as Leader["place"], tile, votes: place.votes }]
      : [];
  });

  return (
    <BoardLayout header={header}>
      {page.tiles.length === 0 ? (
        <p role="status" className={`${YELLOW_STRIP} text-2xl leading-tight`}>
          Nobody drew anything last week, so there&apos;s nothing to vote on.
        </p>
      ) : (
        <>
          <Podium leaders={leaders} />
          {customer ? (
            <VoteGrid
              slug={slug}
              tiles={page.tiles}
              votesLeft={votesLeft}
              votedTileIds={votedTileIds}
              turnstileSiteKey={serverEnv().NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            />
          ) : (
            <>
              {/* One quiet line: the drawings are the argument for signing
                  in, so they get the space. */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-muted-foreground min-w-0 flex-1 text-sm">
                  <span className="text-foreground font-semibold">
                    Want a say?
                  </span>{" "}
                  Sign in to vote. Three votes each per week, from any device.
                </p>
                <GoogleSignIn next={`/b/${slug}/vote`} size="sm" />
              </div>
              <TileWall tiles={page.tiles} />
            </>
          )}
        </>
      )}
    </BoardLayout>
  );
}
