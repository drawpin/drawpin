import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { GoogleSignIn } from "@/components/google-sign-in";
import { getCustomer } from "@/lib/customer";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBoard, getVotingWeek, listLiveTiles } from "../data";
import { VOTES_PER_WEEK } from "./cast-votes";
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

  const backLink = (
    <Link href={`/b/${slug}`} className="text-sm underline underline-offset-4">
      Back to the board
    </Link>
  );

  const heading = (
    <div className="flex items-baseline justify-between gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        Vote for last week&apos;s best
      </h1>
      {backLink}
    </div>
  );

  if (!week) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
        {heading}
        <p role="status" className="bg-muted rounded-lg px-3 py-2 text-sm">
          Voting isn&apos;t open on this board right now. Last week&apos;s
          drawings go up for voting every Monday at 4:00 AM.
        </p>
      </main>
    );
  }

  const page = await listLiveTiles(
    week.id,
    undefined,
    undefined,
    customer?.id ?? null,
  );

  const store = new SupabaseVoteStore(admin);
  const votedTileIds = customer
    ? await store.listVotedTileIds(week.id, customer.id)
    : [];

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      {heading}
      <p className="text-muted-foreground text-sm">{board.name}</p>

      {page.tiles.length === 0 ? (
        <p role="status" className="bg-muted rounded-lg px-3 py-2 text-sm">
          Nobody drew anything last week, so there&apos;s nothing to vote on.
        </p>
      ) : customer ? (
        <VoteGrid
          slug={slug}
          tiles={page.tiles}
          votesLeft={VOTES_PER_WEEK - votedTileIds.length}
          votedTileIds={votedTileIds}
          turnstileSiteKey={serverEnv().NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        />
      ) : (
        <>
          {/* The drawings come first: they are the argument for signing in. */}
          <div className="flex flex-col gap-3 rounded-lg border px-3 py-3">
            <p className="text-sm font-medium">Sign in to vote for one</p>
            <p className="text-muted-foreground text-xs">
              Three votes each per week, so it needs an account. It works from
              any device once you&apos;re in.
            </p>
            <GoogleSignIn next={`/b/${slug}/vote`} size="sm" />
          </div>
          <TileWall tiles={page.tiles} />
        </>
      )}
    </main>
  );
}
