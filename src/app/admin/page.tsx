import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowSquareOutIcon,
  DownloadSimpleIcon,
  PrinterIcon,
} from "@phosphor-icons/react/ssr";
import { connection } from "next/server";
import { boardUrl, createBoardQrCode } from "@/lib/board";
import { ensureJoinCode } from "@/lib/join-code/ensure";
import { hand } from "@/lib/fonts";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { slugifyVenueName, slugMatchesName } from "@/lib/slug";
import { listTimeZones } from "@/lib/timezones";
import { cn } from "@/lib/utils";
import { clockStatus, formatBoundary } from "@/lib/venue-time";
import {
  BoardLayout,
  HEADER_BUTTON,
  INKED_BUTTON,
} from "../b/[slug]/board-look";
import { setBoardPaused, signOut } from "./actions";
import { BlockedAccounts } from "./blocked-accounts";
import { BoardLink } from "./board-link";
import { BoardTiles } from "./board-tiles";
import { CloseBoardForm } from "./close-board-form";
import { JoinCode } from "./join-code";
import { QrCard } from "./qr-card";
import { RenameBoard } from "./rename-board";
import { ReportedTiles } from "./reported-tiles";
import { TimeZone } from "./time-zone";
import {
  listBlockedAccounts,
  listBoardTiles,
  listReportedTiles,
  requireOwnedVenue,
} from "./venue";

export const metadata: Metadata = { title: "Your board · DrawPin" };

/** A section of the owner's screen: an inked card, like the home page's. */
const CARD =
  "border-foreground flex flex-col gap-3 rounded-xl border-2 bg-white p-5 shadow-[4px_4px_0_var(--primary)]";

/** A light, secondary button on the cards. */
const QUIET_BUTTON =
  "border-foreground hover:bg-secondary focus-visible:ring-highlight inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 bg-white px-4 text-sm font-bold outline-none focus-visible:ring-3";

/**
 * The owner's screen (docs/PLAN.md, Owner admin), in the boards' look (UI
 * pass, 2026-10-05): the board's blue header, the QR as a card with the ways
 * to print it, and each setting on an inked card. Reports come first when
 * there are any: they're the only part that needs the owner to do something.
 */
export default async function AdminPage() {
  // The board's state changes as customers post, so never serve a cached copy.
  await connection();

  const venue = await requireOwnedVenue();
  const clock = clockStatus(new Date(), venue.clock);
  const url = boardUrl(serverEnv().SITE_URL, venue.slug);
  const [qr, tiles, code, reported, blocked] = await Promise.all([
    createBoardQrCode(url),
    listBoardTiles(venue.id),
    // Created on the first view, so it exists before anyone is told it
    // (ADR-003). It stays until the owner makes a new one (ADR-014).
    ensureJoinCode(createAdminClient(), venue.id),
    listReportedTiles(venue.id),
    listBlockedAccounts(venue.id),
  ]);

  return (
    <BoardLayout
      narrow
      header={
        <>
          <p
            className={`${hand.className} bg-winner text-foreground w-fit -rotate-2 rounded-sm px-2.5 py-0.5 text-xl leading-tight font-bold`}
          >
            Your board
          </p>
          <div className="flex flex-col gap-1">
            <h1 className="text-4xl leading-[1.02] font-black tracking-tight break-words">
              {venue.name}
            </h1>
            <p className="text-sm break-all text-white/80">
              {url.replace(/^https?:\/\//, "")}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Link href={`/b/${venue.slug}`} className={HEADER_BUTTON}>
              <ArrowSquareOutIcon weight="bold" className="size-5" />
              Open the board
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="focus-visible:ring-highlight h-11 rounded-xl px-3 text-sm font-semibold text-white/85 underline underline-offset-4 outline-none hover:text-white focus-visible:ring-3"
              >
                Sign out
              </button>
            </form>
          </div>
        </>
      }
    >
      {/* First thing on the screen when there is one: it is the only part
          that needs the owner to do something. */}
      {reported.length > 0 && (
        <div className={CARD}>
          <ReportedTiles tiles={reported} />
        </div>
      )}

      <section className="flex flex-col gap-4">
        <QrCard name={venue.name} url={url} svg={qr.svg} code={code} />
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/admin/print" className={INKED_BUTTON}>
            <PrinterIcon weight="bold" className="size-5" />
            Print a table card or poster
          </Link>
          <a
            href={qr.pngDataUrl}
            download={`drawpin-${venue.slug}-qr.png`}
            className={QUIET_BUTTON}
          >
            <DownloadSimpleIcon weight="bold" className="size-5" />
            QR only
          </a>
        </div>
      </section>

      <div className={CARD}>
        <JoinCode code={code} />
      </div>

      <div className={CARD}>
        <BoardLink
          url={url}
          matchesName={slugMatchesName(venue.slug, venue.name)}
          nextUrl={`${new URL("/b/", serverEnv().SITE_URL)}${slugifyVenueName(venue.name)}-····`}
        />
      </div>

      <div className={CARD}>
        <RenameBoard name={venue.name} />
      </div>

      {/* Each time is shown in the zone it falls in: a change's start in the
          zone it ends, a new zone's first week in the new zone. */}
      <div className={CARD}>
        <TimeZone
          zones={listTimeZones()}
          timeZone={clock.timeZone}
          scheduled={
            clock.scheduled && {
              timeZone: clock.scheduled.timeZone,
              from: formatBoundary(clock.scheduled.from, clock.timeZone),
            }
          }
          settlingUntil={
            clock.settlingUntil &&
            formatBoundary(clock.settlingUntil, clock.timeZone)
          }
          nextChangeFrom={formatBoundary(clock.nextChangeFrom, clock.timeZone)}
        />
      </div>

      {/* A row, not a card's worth: it's one fact and one switch. */}
      <section className="border-foreground flex items-center justify-between gap-3 rounded-xl border-2 bg-white py-2.5 pr-2.5 pl-4 shadow-[4px_4px_0_var(--primary)]">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className={`border-foreground size-3 shrink-0 rounded-full border-2 ${venue.isPaused ? "bg-winner" : "bg-primary"}`}
          />
          <div className="min-w-0">
            <h2 className="leading-tight font-black tracking-tight">
              {venue.isPaused ? "Board paused" : "Board open"}
            </h2>
            <p className="text-muted-foreground text-sm leading-snug">
              {venue.isPaused
                ? "People can see the board but can't post."
                : "People can post to the board."}
            </p>
          </div>
        </div>
        <form action={setBoardPaused} className="shrink-0">
          <input
            type="hidden"
            name="paused"
            value={venue.isPaused ? "false" : "true"}
          />
          <button
            type="submit"
            className={cn(
              venue.isPaused ? INKED_BUTTON : QUIET_BUTTON,
              "h-11 px-3.5 text-sm",
            )}
          >
            {venue.isPaused ? "Resume posting" : "Pause board"}
          </button>
        </form>
      </section>

      <section className={CARD}>
        <h2 className="font-black tracking-tight">This week&apos;s drawings</h2>
        <p className="text-muted-foreground text-sm">
          Removing a drawing takes it off the board for everyone and deletes it.
          This can&apos;t be undone.
        </p>
        <BoardTiles tiles={tiles} />
      </section>

      {blocked.length > 0 && (
        <div className={CARD}>
          <BlockedAccounts accounts={blocked} />
        </div>
      )}

      {/* Last and set apart: it can't be undone. */}
      <div className={`${CARD} shadow-[4px_4px_0_var(--destructive)]`}>
        <CloseBoardForm name={venue.name} />
      </div>
    </BoardLayout>
  );
}
