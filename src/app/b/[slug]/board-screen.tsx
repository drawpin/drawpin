import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CrownSimpleIcon,
  PencilSimpleIcon,
  TrophyIcon,
} from "@phosphor-icons/react/ssr";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AccountLine } from "@/components/account-line";
import { GoogleSignIn } from "@/components/google-sign-in";
import { getCustomer } from "@/lib/customer";
import { serverEnv } from "@/lib/env";
import { openFinal } from "@/lib/monthly-final";
import { createAdminClient } from "@/lib/supabase/admin";
import { weekdayFor } from "@/lib/venue-time";
import {
  BoardLayout,
  HEADER_BUTTON,
  INKED_BUTTON,
  YELLOW_STRIP,
} from "./board-look";
import { BoardTitle } from "./board-title";
import {
  getBoard,
  getBoardStats,
  getLiveTiles,
  getPostingWeek,
  getVotingWeek,
  listLiveTiles,
  peekAtWeek,
} from "./data";
import { listWeekTimings } from "./final/data";
import { TileFeed } from "./tile-feed";
import { VOTES_PER_WEEK } from "./vote/cast-votes";
import { type Leader, Podium } from "./vote/podium";
import { rankPodium } from "./vote/rank-podium";
import { SignInToVote } from "./vote/sign-in-to-vote";
import { SupabaseVoteStore } from "./vote/supabase-vote-store";
import { VoteGrid } from "./vote/vote-grid";
import { PEEK_COUNT, VotePeek } from "./vote-peek";

/**
 * A board, in one of two views on one page (UI pass, 2026-10-04):
 *
 * - `board` (`/b/<slug>`): this week's drawings, with the way into voting.
 * - `vote` (`/b/<slug>/vote`): voting on last week's drawings, with the live
 *   podium (ADR-008).
 *
 * Both keep the same header, and moving between them only swaps what's under
 * it (the links don't scroll the page), so it reads as the board changing
 * mode: the podium rises in and the drawings swing in on their pins. Each view
 * keeps its own address, so a link, the back button and the refresh after
 * voting all land on the right one.
 */
export async function BoardScreen({
  slug,
  view,
}: {
  slug: string;
  view: "board" | "vote";
}) {
  // Always render per request: drawings and votes change while it's open.
  await connection();

  const board = await getBoard(slug);
  if (!board) notFound();

  const admin = createAdminClient();
  const customer = await getCustomer(admin);
  const store = new SupabaseVoteStore(admin);
  const [week, votingWeek, stats] = await Promise.all([
    getPostingWeek(board.id),
    getVotingWeek(board.id),
    getBoardStats(board.id),
  ]);
  const votedTileIds =
    votingWeek && customer
      ? await store.listVotedTileIds(votingWeek.id, customer.id)
      : [];
  // A signed-out visitor sees the prompt too: they can sign in from there.
  const votesLeft = VOTES_PER_WEEK - votedTileIds.length;
  const closesOn = votingWeek
    ? weekdayFor(new Date(votingWeek.votingEndsAt), board.timezone)
    : null;

  const header = (
    <>
      {/* In the vote view, someone signed out finds the way in up here. */}
      {view === "vote" && votingWeek && !customer && (
        <div className="absolute top-7 right-4">
          <GoogleSignIn next={`/b/${slug}/vote`} label="Sign in" size="sm" />
        </div>
      )}
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
        {/* A button, not small print: winners are what the board is for.
            The trophy takes the yellow of winning. */}
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
  );

  if (view === "vote") {
    return (
      <BoardLayout header={header}>
        <VoteModeBar
          slug={slug}
          closesOn={closesOn}
          note={
            !votingWeek
              ? null
              : !customer
                ? "Sign in to vote"
                : votesLeft === 0
                  ? "All your votes are in"
                  : `${votesLeft} ${votesLeft === 1 ? "vote" : "votes"} left`
          }
        />
        {votingWeek ? (
          <VoteView
            slug={slug}
            weekId={votingWeek.id}
            customerId={customer?.id ?? null}
            votesLeft={votesLeft}
            votedTileIds={votedTileIds}
            store={store}
          />
        ) : (
          <p role="status" className={`${YELLOW_STRIP} text-2xl leading-tight`}>
            Voting isn&apos;t open on this board right now. Last week&apos;s
            drawings go up for voting every Monday at 4:00 AM.
          </p>
        )}
        <AccountLine customer={customer} next={`/b/${slug}/vote`} />
      </BoardLayout>
    );
  }

  // The board view.
  // The viewer is passed so their own tiles are marked: nobody reports
  // themselves, and nobody votes for themselves later.
  const [page, timings, votePeek] = await Promise.all([
    week
      ? listLiveTiles(week.id, undefined, undefined, customer?.id ?? null)
      : null,
    listWeekTimings(admin, board.id),
    votingWeek && votesLeft > 0 ? peekAtWeek(votingWeek.id, PEEK_COUNT) : null,
  ]);
  const monthlyFinal = openFinal(timings, board.timezone, new Date());

  return (
    <BoardLayout header={header}>
      {board.isPaused && (
        <p role="status" className="bg-secondary rounded-2xl px-4 py-3 text-sm">
          This board is paused. You can look around, but new posts are off for
          now.
        </p>
      )}

      {votingWeek && votePeek && votePeek.total > 0 && closesOn && (
        <VotePeek
          href={`/b/${slug}/vote`}
          peek={votePeek}
          votesLeft={votesLeft}
          closesOn={closesOn}
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

/**
 * Where the vote card was, in the vote view: the way back to this week, and
 * what's being voted on. Comes in like the card it replaces.
 */
function VoteModeBar({
  slug,
  closesOn,
  note,
}: {
  slug: string;
  closesOn: string | null;
  note: string | null;
}) {
  return (
    <div className="motion-safe:animate-fade-up border-foreground flex items-center justify-between gap-3 rounded-xl border-2 bg-white p-2 pr-4 shadow-[5px_5px_0_var(--primary)]">
      <Link
        href={`/b/${slug}`}
        scroll={false}
        className="focus-visible:ring-highlight hover:bg-secondary inline-flex h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-bold outline-none focus-visible:ring-3"
      >
        <ArrowLeftIcon weight="bold" className="size-5" />
        This week
      </Link>
      <p className="min-w-0 text-right">
        <span className="block leading-tight font-black">
          Voting on last week
        </span>
        <span className="text-muted-foreground block text-sm font-semibold">
          {[note, closesOn && `closes ${closesOn}`].filter(Boolean).join(", ")}
        </span>
      </p>
    </div>
  );
}

/**
 * The vote view's body: the live podium (counts are public while voting is
 * open, ADR-008) and last week's drawings to pick from, or, signed out, to
 * tap and be asked to sign in.
 */
async function VoteView({
  slug,
  weekId,
  customerId,
  votesLeft,
  votedTileIds,
  store,
}: {
  slug: string;
  weekId: string;
  customerId: string | null;
  votesLeft: number;
  votedTileIds: string[];
  store: SupabaseVoteStore;
}) {
  const [page, castVotes] = await Promise.all([
    listLiveTiles(weekId, undefined, undefined, customerId),
    store.listCastVotes(weekId),
  ]);
  if (page.tiles.length === 0) {
    return (
      <p role="status" className={`${YELLOW_STRIP} text-2xl leading-tight`}>
        Nobody drew anything last week, so there&apos;s nothing to vote on.
      </p>
    );
  }

  const places = rankPodium(castVotes);
  const leaderTiles = await getLiveTiles(
    places.map((place) => place.tileId),
    undefined,
    customerId,
  );
  const leaders = places.flatMap((place, index): Leader[] => {
    const tile = leaderTiles.find((candidate) => candidate.id === place.tileId);
    return tile
      ? [{ place: (index + 1) as Leader["place"], tile, votes: place.votes }]
      : [];
  });

  return (
    <>
      <Podium leaders={leaders} />
      {customerId ? (
        <VoteGrid
          slug={slug}
          tiles={page.tiles}
          votesLeft={votesLeft}
          votedTileIds={votedTileIds}
          turnstileSiteKey={serverEnv().NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        />
      ) : (
        // Signed out: tapping a drawing to vote asks them to sign in.
        <SignInToVote tiles={page.tiles} next={`/b/${slug}/vote`} />
      )}
    </>
  );
}
