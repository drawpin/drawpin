import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  CrownSimpleIcon,
  PencilSimpleIcon,
  TrophyIcon,
} from "@phosphor-icons/react/ssr";
import { notFound } from "next/navigation";
import { AccountBar } from "@/components/account-bar";
import { buttonVariants } from "@/components/ui/button";
import { connection } from "next/server";
import { getCustomer } from "@/lib/customer";
import { openFinal } from "@/lib/monthly-final";
import { createAdminClient } from "@/lib/supabase/admin";
import { weekdayFor } from "@/lib/venue-time";
import {
  getBoard,
  getBoardStats,
  getPostingWeek,
  getVotingWeek,
  listLiveTiles,
} from "./data";
import { BoardStatsLine } from "./board-stats";
import { listWeekTimings } from "./final/data";
import { VOTES_PER_WEEK } from "./vote/cast-votes";
import { SupabaseVoteStore } from "./vote/supabase-vote-store";
import { TileFeed } from "./tile-feed";

export async function generateMetadata({
  params,
}: PageProps<"/b/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const board = await getBoard(slug);
  if (!board) return { title: "Board not found · DrawPin" };

  return {
    title: `${board.name} · DrawPin`,
    // Shared into a group chat, the board is the thing being sent — so the
    // card carries its name alone, without the site's name after it, and the
    // line under it invites the person who was sent it. They have never heard
    // of DrawPin and are deciding whether to tap, so it says what to do rather
    // than what the page contains.
    openGraph: {
      type: "website",
      siteName: "DrawPin",
      title: board.name,
      description:
        "Tap to join the drawing board! One tile each per day, vote for your favorite!",
      url: `/b/${slug}`,
      images: [{ url: "/og-v2.png", width: 1200, height: 630, alt: "DrawPin" }],
    },
  };
}

export default async function BoardPage({ params }: PageProps<"/b/[slug]">) {
  // Always render per request: the feed changes whenever someone posts.
  await connection();

  const { slug } = await params;
  const board = await getBoard(slug);
  if (!board) notFound();

  const admin = createAdminClient();
  const customer = await getCustomer(admin);
  const week = await getPostingWeek(board.id);
  // The viewer is passed so their own tiles are marked: nobody reports
  // themselves, and nobody votes for themselves later.
  const page = week
    ? await listLiveTiles(week.id, undefined, undefined, customer?.id ?? null)
    : null;
  const votingWeek = await getVotingWeek(board.id);
  const stats = await getBoardStats(board.id);
  const monthlyFinal = openFinal(
    await listWeekTimings(admin, board.id),
    board.timezone,
    new Date(),
  );
  // A signed-out visitor sees the prompt too: they can sign in from there.
  const votesLeft =
    votingWeek && customer
      ? VOTES_PER_WEEK -
        (await new SupabaseVoteStore(admin).countVotes(
          votingWeek.id,
          customer.id,
        ))
      : VOTES_PER_WEEK;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col items-start gap-1">
          <h1 className="text-2xl font-extrabold tracking-tight break-words">
            {board.name}
          </h1>
          {stats && (
            <BoardStatsLine
              venueId={board.id}
              weekId={week?.id ?? null}
              initialStats={stats}
            />
          )}
          <Link
            href={`/b/${slug}/hall-of-fame`}
            className="text-primary -ml-1 inline-flex min-h-11 items-center gap-1.5 px-1 text-sm font-semibold underline-offset-4 hover:underline"
          >
            <TrophyIcon className="size-4" weight="bold" />
            Hall of Fame
          </Link>
        </div>
        {!board.isPaused && (
          <Link href={`/b/${slug}/draw`} className={buttonVariants()}>
            <PencilSimpleIcon weight="bold" />
            Draw
          </Link>
        )}
      </div>

      {board.isPaused && (
        <p role="status" className="bg-secondary rounded-2xl px-4 py-3 text-sm">
          This board is paused. You can look around, but new posts are off for
          now.
        </p>
      )}

      {votingWeek && votesLeft > 0 && (
        // Orange: the one thing on the board that's happening right now.
        <Link
          href={`/b/${slug}/vote`}
          className="bg-attention text-foreground focus-visible:ring-highlight flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 font-bold outline-none focus-visible:ring-3"
        >
          <span>
            Vote for last week&apos;s best
            <span className="block text-sm font-medium">
              {votesLeft} {votesLeft === 1 ? "vote" : "votes"} left, closes{" "}
              {weekdayFor(new Date(votingWeek.votingEndsAt), board.timezone)}
            </span>
          </span>
          <ArrowRightIcon className="size-5 shrink-0" weight="bold" />
        </Link>
      )}

      {monthlyFinal && (
        // Yellow: it's about crowning a winner.
        <Link
          href={`/b/${slug}/final`}
          className="bg-winner text-foreground focus-visible:ring-highlight flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 font-bold outline-none focus-visible:ring-3"
        >
          <span className="flex items-center gap-2">
            <CrownSimpleIcon className="size-5 shrink-0" weight="fill" />
            Vote for this month&apos;s super winner
          </span>
          <ArrowRightIcon className="size-5 shrink-0" weight="bold" />
        </Link>
      )}

      {/* Signed in, this is one quiet line; signed out it's an invitation,
          which belongs after the drawings rather than in front of them. */}
      {customer && <AccountBar customer={customer} next={`/b/${slug}`} />}

      <TileFeed
        // Tiles and the pagination cursor belong to one week; start fresh when
        // the board moves on to a new one.
        key={week?.id ?? "no-week"}
        venueId={board.id}
        weekId={week?.id ?? null}
        canReport={customer !== null}
        postingEndsAt={week?.postingEndsAt ?? null}
        initialTiles={page?.tiles ?? []}
        initialCursor={page?.nextCursor ?? null}
      />

      {!customer && <AccountBar customer={null} next={`/b/${slug}`} />}
    </main>
  );
}
