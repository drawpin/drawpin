import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { GoogleSignIn } from "@/components/google-sign-in";
import { getCustomer } from "@/lib/customer";
import { serverEnv } from "@/lib/env";
import { openFinal } from "@/lib/monthly-final";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBoard } from "../data";
import {
  ensureFinal,
  hasVotedInFinal,
  listFinalists,
  listWeekTimings,
} from "./data";
import { FinalGrid } from "./final-grid";

export async function generateMetadata({
  params,
}: PageProps<"/b/[slug]/final">): Promise<Metadata> {
  const { slug } = await params;
  const board = await getBoard(slug);
  return {
    title: board
      ? `Monthly final · ${board.name}`
      : "Board not found · DrawPin",
  };
}

/** "September 2026", from the first day of the month being judged. */
function monthLabel(month: string): string {
  return new Date(`${month}T12:00:00Z`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export default async function FinalPage({
  params,
}: PageProps<"/b/[slug]/final">) {
  await connection();

  const { slug } = await params;
  const board = await getBoard(slug);
  if (!board) notFound();

  const admin = createAdminClient();
  const weeks = await listWeekTimings(admin, board.id);
  const window = openFinal(weeks, board.timezone, new Date());
  const customer = await getCustomer(admin);

  const heading = (
    <div className="flex items-baseline justify-between gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Monthly final</h1>
      <Link
        href={`/b/${slug}`}
        className="text-sm underline underline-offset-4"
      >
        Back to the board
      </Link>
    </div>
  );

  if (!window) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
        {heading}
        <p role="status" className="bg-muted rounded-lg px-3 py-2 text-sm">
          No final is running right now. Each month&apos;s winners meet about
          two weeks after the month ends.
        </p>
      </main>
    );
  }

  const finalId = await ensureFinal(admin, board.id, window);
  const finalists = await listFinalists(admin, finalId, customer?.id ?? null);
  const alreadyVoted = customer
    ? await hasVotedInFinal(admin, finalId, customer.id)
    : false;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      {heading}
      <p className="text-muted-foreground text-sm">
        {board.name} · {monthLabel(window.month)}
      </p>

      {finalists.length === 0 ? (
        <p role="status" className="bg-muted rounded-lg px-3 py-2 text-sm">
          Nothing won a week that month, so there&apos;s no final to hold.
        </p>
      ) : alreadyVoted ? (
        <p role="status" className="bg-muted rounded-lg px-3 py-2 text-sm">
          You&apos;ve voted in this month&apos;s final. The super winner is
          crowned when it closes.
        </p>
      ) : customer ? (
        <FinalGrid
          slug={slug}
          finalists={finalists}
          turnstileSiteKey={serverEnv().NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        />
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border px-3 py-3">
          <p className="text-sm font-medium">Sign in to vote</p>
          <p className="text-muted-foreground text-xs">
            One vote per person in the final, so it needs an account.
          </p>
          <GoogleSignIn next={`/b/${slug}/final`} size="sm" />
        </div>
      )}
    </main>
  );
}
