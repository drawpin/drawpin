import type { Metadata, Viewport } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  CrownSimpleIcon,
  PencilSimpleIcon,
  TrophyIcon,
} from "@phosphor-icons/react/ssr";
import { notFound } from "next/navigation";
import { AccountLine } from "@/components/account-line";
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
  peekAtWeek,
} from "./data";
import { BoardLayout, HEADER_BUTTON, INKED_BUTTON } from "./board-look";
import { BoardTitle } from "./board-title";
import { listWeekTimings } from "./final/data";
import { VOTES_PER_WEEK } from "./vote/cast-votes";
import { SupabaseVoteStore } from "./vote/supabase-vote-store";
import { TileFeed } from "./tile-feed";
import { PEEK_COUNT, VotePeek } from "./vote-peek";

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

/** The phone's status bar matches the board's blue header. */
export const viewport: Viewport = { themeColor: "#004aad" };

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
  const votePeek =
    votingWeek && votesLeft > 0
      ? await peekAtWeek(votingWeek.id, PEEK_COUNT)
      : null;

  return (
    <BoardLayout
      header={
        <>
          {stats ? (
            <BoardTitle
              name={board.name}
              venueId={board.id}
              weekId={week?.id ?? null}
              initialStats={stats}
            />
          ) : (
            <h1 className="text-4xl leading-[1.02] font-black tracking-tight break-words">
              {board.name}
            </h1>
          )}
          <div className="flex items-center justify-between gap-3">
            {/* A button, not small print: winners are what the board is
                for. The trophy takes the yellow of winning. */}
            <Link href={`/b/${slug}/hall-of-fame`} className={HEADER_BUTTON}>
              <TrophyIcon weight="fill" className="text-winner size-5" />
              Hall of Fame
            </Link>
            {!board.isPaused && (
              // Its pencil scribbles every few seconds (`draw-awake`).
              <Link
                href={`/b/${slug}/draw`}
                className={`draw-awake ${INKED_BUTTON}`}
              >
                <PencilSimpleIcon weight="bold" className="size-5" />
                Draw
              </Link>
            )}
          </div>
        </>
      }
    >
      {board.isPaused && (
        <p role="status" className="bg-secondary rounded-2xl px-4 py-3 text-sm">
          This board is paused. You can look around, but new posts are off for
          now.
        </p>
      )}

      {votingWeek && votePeek && votePeek.total > 0 && (
        <VotePeek
          href={`/b/${slug}/vote`}
          peek={votePeek}
          votesLeft={votesLeft}
          closesOn={weekdayFor(
            new Date(votingWeek.votingEndsAt),
            board.timezone,
          )}
        />
      )}

      {monthlyFinal && (
        // Yellow: it's about crowning a winner.
        <Link
          href={`/b/${slug}/final`}
          className="bg-winner text-foreground border-foreground focus-visible:ring-highlight flex items-center justify-between gap-3 rounded-xl border-2 px-4 py-3.5 font-bold shadow-[4px_4px_0_var(--foreground)] outline-none focus-visible:ring-3"
        >
          <span className="flex items-center gap-2">
            <CrownSimpleIcon className="size-5 shrink-0" weight="fill" />
            Vote for this month&apos;s super winner
          </span>
          <ArrowRightIcon className="size-5 shrink-0" weight="bold" />
        </Link>
      )}

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

      {/* Small print at the foot of the board: sign-in turns up on Draw and
          Vote, where it's needed, so here it's only for whoever looks. */}
      <AccountLine customer={customer} next={`/b/${slug}`} />
    </BoardLayout>
  );
}
