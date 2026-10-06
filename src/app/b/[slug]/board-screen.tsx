import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CrownSimpleIcon,
  PencilSimpleIcon,
  TrophyIcon,
} from "@phosphor-icons/react/ssr";
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
  getBoardStats,
  getLiveTiles,
  getPostingWeek,
  getVotingWeek,
  listLiveTiles,
  peekAtWeek,
  requireBoard,
} from "./data";
import { listWeekTimings } from "./final/data";
import { listReveals, type Reveal } from "./reveal/data";
import { WinnersReveal } from "./reveal/winners-reveal";
import { TileFeed } from "./tile-feed";
import type { TilePage } from "./tiles";
import { VOTES_PER_WEEK } from "./vote/cast-votes";
import { type Leader, Podium } from "./vote/podium";
import { type CastVote, rankPodium } from "./vote/rank-podium";
import { SignInToVote } from "./vote/sign-in-to-vote";
import { SupabaseVoteStore } from "./vote/supabase-vote-store";
import { VoteGrid } from "./vote/vote-grid";
import { PEEK_COUNT, VotePeek } from "./vote-peek";

/**
 * A board, in one of two views on one page (UI pass, 2026-10-04):
 *
 * - `board` (`/b/<slug>`): this week's drawings, with the way into voting.
 * - `vote` (`/b/<slug>/vote`): voting on last week's drawings, with the live
 *   podium (ADR-011).
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

  // The page's reads go out in three rounds, each round all at once, since
  // every read waits on the database (performance pass, 2026-10-06; before,
  // about seven ran one after another). First the board and who's looking,
  // which don't depend on each other.
  const admin = createAdminClient();
  const store = new SupabaseVoteStore(admin);
  const [board, customer] = await Promise.all([
    // An old link, from before the owner changed the board's address, moves
    // on to the current one (ADR-008).
    requireBoard(slug, view === "vote" ? "/vote" : ""),
    getCustomer(admin, { check: "token" }),
  ]);

  // Then everything that only needs the board.
  const onBoardView = view === "board";
  const [week, votingWeek, stats, timings, reveals] = await Promise.all([
    getPostingWeek(board.id),
    getVotingWeek(board.id),
    getBoardStats(board.id),
    onBoardView ? listWeekTimings(admin, board.id) : null,
    // Decoration: a board must still load if the results can't be read.
    onBoardView
      ? listReveals(admin, board.id, board.timezone).catch((error: unknown) => {
          console.error("Could not load the winners reveal", error);
          return [] as Reveal[];
        })
      : ([] as Reveal[]),
  ]);

  // Then what needs this week, last week or the viewer. The viewer is passed
  // to the tiles so their own are marked: nobody reports themselves, and
  // nobody votes for themselves later.
  const onVoteView = view === "vote" && votingWeek !== null;
  const [votedTileIds, page, peek, votingPage, castVotes] = await Promise.all([
    votingWeek && customer
      ? store.listVotedTileIds(votingWeek.id, customer.id)
      : [],
    onBoardView && week
      ? listLiveTiles(week.id, undefined, undefined, customer?.id ?? null)
      : null,
    onBoardView && votingWeek ? peekAtWeek(votingWeek.id, PEEK_COUNT) : null,
    // The vote view's drawings and its podium's counts, in the same round.
    onVoteView && votingWeek
      ? listLiveTiles(votingWeek.id, undefined, undefined, customer?.id ?? null)
      : null,
    onVoteView && votingWeek ? store.listCastVotes(votingWeek.id) : null,
  ]);
  // A signed-out visitor sees the prompt too: they can sign in from there.
  const votesLeft = VOTES_PER_WEEK - votedTileIds.length;
  const closesOn = votingWeek
    ? weekdayFor(new Date(votingWeek.votingEndsAt), board.timezone)
    : null;

  const header = (
    <>
      {/* In the vote view, someone signed out finds the way in up here,
          beside the name rather than over it, so a long name wraps. */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
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
        </div>
        {view === "vote" && votingWeek && !customer && (
          <div className="shrink-0">
            <GoogleSignIn
              next={`/b/${slug}/vote`}
              label="Sign in"
              size="sm"
              withEmail={false}
            />
          </div>
        )}
      </div>
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
            customerId={customer?.id ?? null}
            votesLeft={votesLeft}
            votedTileIds={votedTileIds}
            page={votingPage!}
            castVotes={castVotes!}
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
  // The peek only shows while there are votes left to cast.
  const votePeek = votesLeft > 0 ? peek : null;
  const monthlyFinal = timings
    ? openFinal(timings, board.timezone, new Date())
    : null;

  return (
    <BoardLayout header={header}>
      {board.isPaused && (
        <p role="status" className="bg-secondary rounded-2xl px-4 py-3 text-sm">
          This board is paused. You can look around, but new posts are off for
          now.
        </p>
      )}

      {reveals.map((reveal) => (
        <WinnersReveal
          key={reveal.id}
          reveal={reveal}
          hallOfFameHref={`/b/${slug}/hall-of-fame`}
        />
      ))}

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
 * open, ADR-011) and last week's drawings to pick from, or, signed out, to
 * tap and be asked to sign in.
 */
async function VoteView({
  slug,
  customerId,
  votesLeft,
  votedTileIds,
  page,
  castVotes,
}: {
  slug: string;
  customerId: string | null;
  votesLeft: number;
  votedTileIds: string[];
  /** Last week's first page of drawings, read with the rest of the page. */
  page: TilePage;
  /** Last week's votes so far, for the podium. */
  castVotes: CastVote[];
}) {
  if (page.tiles.length === 0) {
    return (
      <p role="status" className={`${YELLOW_STRIP} text-2xl leading-tight`}>
        Nobody drew anything last week, so there&apos;s nothing to vote on.
      </p>
    );
  }

  const places = rankPodium(castVotes);
  // The leaders are nearly always among the drawings already read; only one
  // further down last week's board needs its own read.
  const onPage = page.tiles.filter((tile) =>
    places.some((place) => place.tileId === tile.id),
  );
  const missing = places
    .map((place) => place.tileId)
    .filter((id) => !onPage.some((tile) => tile.id === id));
  const leaderTiles =
    missing.length > 0
      ? [...onPage, ...(await getLiveTiles(missing, undefined, customerId))]
      : onPage;
  const leaders = places.flatMap((place, index): Leader[] => {
    const tile = leaderTiles.find((candidate) => candidate.id === place.tileId);
    return tile
      ? [{ place: (index + 1) as Leader["place"], tile, votes: place.votes }]
      : [];
  });

  return (
    <>
      <div className="mx-auto w-full max-w-2xl">
        <Podium leaders={leaders} />
      </div>
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
