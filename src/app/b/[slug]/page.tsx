import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountBar } from "@/components/account-bar";
import { buttonVariants } from "@/components/ui/button";
import { connection } from "next/server";
import { getCustomer } from "@/lib/customer";
import { openFinal } from "@/lib/monthly-final";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBoard, getPostingWeek, getVotingWeek, listLiveTiles } from "./data";
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
    // Shared into a group chat, the venue is the thing being sent — so the
    // card carries its name alone, without the site's name after it, and the
    // line under it is an invitation to this board rather than a slogan the
    // picture already shows.
    openGraph: {
      type: "website",
      siteName: "DrawPin",
      title: board.name,
      description:
        "Draw a tile, see everyone else's, and vote for this week's winner.",
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
        <div className="flex flex-col items-start gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {board.name}
          </h1>
          <Link
            href={`/b/${slug}/hall-of-fame`}
            className="text-muted-foreground text-sm underline underline-offset-4"
          >
            Hall of Fame
          </Link>
        </div>
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

      {votingWeek && votesLeft > 0 && (
        <Link
          href={`/b/${slug}/vote`}
          className="bg-muted rounded-lg px-3 py-2 text-sm underline underline-offset-4"
        >
          Vote for last week&apos;s best — {votesLeft}{" "}
          {votesLeft === 1 ? "vote" : "votes"} left
        </Link>
      )}

      {monthlyFinal && (
        <Link
          href={`/b/${slug}/final`}
          className="bg-muted rounded-lg px-3 py-2 text-sm underline underline-offset-4"
        >
          Vote for this month&apos;s super winner
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
