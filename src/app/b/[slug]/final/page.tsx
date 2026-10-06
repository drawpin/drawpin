import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, CrownSimpleIcon } from "@phosphor-icons/react/ssr";
import { connection } from "next/server";
import { GoogleSignIn } from "@/components/google-sign-in";
import { getCustomer } from "@/lib/customer";
import { serverEnv } from "@/lib/env";
import { openFinal } from "@/lib/monthly-final";
import { hand } from "@/lib/fonts";
import { createAdminClient } from "@/lib/supabase/admin";
import { BoardLayout, HEADER_BUTTON, YELLOW_STRIP } from "../board-look";
import { getBoard, requireBoard } from "../data";
import { sharePreview } from "../share-preview";
import { SignInToVote } from "../vote/sign-in-to-vote";
import {
  ensureFinal,
  hasVotedInFinal,
  listFinalists,
  listWeekTimings,
} from "./data";
import { FinalGrid } from "./final-grid";
import { FinalistWall } from "./finalist-wall";
import { finalistTile, wonItsWeekNotes } from "./finalists";

export async function generateMetadata({
  params,
}: PageProps<"/b/[slug]/final">): Promise<Metadata> {
  const { slug } = await params;
  const board = await getBoard(slug);
  return {
    title: board
      ? `Monthly final · ${board.name}`
      : "Board not found · DrawPin",
    openGraph: board ? sharePreview("final", board) : undefined,
  };
}

/** "September 2026", from the first day of the month being judged. */
function monthLabel(month: string): string {
  return new Date(`${month}T12:00:00Z`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

/**
 * The monthly final, in the board's look (UI pass, 2026-10-05): the blue
 * header, the month's weekly winners pinned up as polaroids, and one vote
 * each. Its counts stay hidden until it closes (ADR-011).
 */
export default async function FinalPage({
  params,
}: PageProps<"/b/[slug]/final">) {
  await connection();

  const { slug } = await params;
  // Reads that don't depend on each other go out together (performance
  // pass, 2026-10-06): the board and who's looking, then the finalists and
  // whether this account has voted.
  const admin = createAdminClient();
  const [board, customer] = await Promise.all([
    requireBoard(slug, "/final"),
    getCustomer(admin, { check: "token" }),
  ]);

  const weeks = await listWeekTimings(admin, board.id);
  const window = openFinal(weeks, board.timezone, new Date());
  const finalId = window ? await ensureFinal(admin, board.id, window) : null;
  const [finalists, alreadyVoted] = await Promise.all([
    finalId ? listFinalists(admin, finalId, customer?.id ?? null) : [],
    finalId && customer ? hasVotedInFinal(admin, finalId, customer.id) : false,
  ]);

  // The note above the title: what this visitor can do in the final.
  const note =
    finalists.length === 0
      ? null
      : !customer
        ? "Sign in to vote!"
        : alreadyVoted
          ? "Your vote is in!"
          : "One vote each!";

  const header = (
    <>
      {/* For anyone signed out, the way in, in the corner. */}
      {finalists.length > 0 && !customer && (
        <div className="absolute top-7 right-4">
          <GoogleSignIn next={`/b/${slug}/final`} label="Sign in" size="sm" />
        </div>
      )}
      {note && (
        <p
          className={`${hand.className} bg-winner text-foreground w-fit -rotate-2 rounded-sm px-2.5 py-0.5 text-xl leading-tight font-bold`}
        >
          {note}
        </p>
      )}
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-4xl leading-[1.02] font-black tracking-tight">
          <CrownSimpleIcon weight="fill" className="text-winner size-9" />
          Monthly final
        </h1>
        <p className="text-sm text-white/80">
          {board.name}
          {window && ` · ${monthLabel(window.month)}`}
        </p>
      </div>
      <Link href={`/b/${slug}`} className={`${HEADER_BUTTON} w-fit`}>
        <ArrowLeftIcon weight="bold" className="size-5" />
        Back to the board
      </Link>
    </>
  );

  const heading = window && (
    <h2 className={`${YELLOW_STRIP} text-3xl`}>
      {monthLabel(window.month)}&apos;s winners
    </h2>
  );

  return (
    <BoardLayout header={header}>
      {!window ? (
        <p role="status" className={`${YELLOW_STRIP} text-2xl leading-tight`}>
          No final is running right now. Each month&apos;s winners meet about
          two weeks after the month ends.
        </p>
      ) : finalists.length === 0 ? (
        <p role="status" className={`${YELLOW_STRIP} text-2xl leading-tight`}>
          Nothing won a week that month, so there&apos;s no final to hold.
        </p>
      ) : alreadyVoted ? (
        <section className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm font-semibold">
            You&apos;ve voted in this month&apos;s final. The super winner is
            crowned when it closes.
          </p>
          {heading}
          <FinalistWall finalists={finalists} />
        </section>
      ) : customer ? (
        <section className="flex flex-col gap-4">
          {heading}
          <FinalGrid
            slug={slug}
            finalists={finalists}
            turnstileSiteKey={serverEnv().NEXT_PUBLIC_TURNSTILE_SITE_KEY}
          />
        </section>
      ) : (
        // Signed out: tapping a finalist to vote asks them to sign in.
        <SignInToVote
          tiles={finalists.map(finalistTile)}
          next={`/b/${slug}/final`}
          heading={heading}
          notes={wonItsWeekNotes(finalists)}
          ask="Sign in to vote. One vote each in the final!"
        />
      )}
    </BoardLayout>
  );
}
