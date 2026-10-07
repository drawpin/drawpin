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
import { MODERATION_LEVEL_INFO } from "@/lib/moderation/levels";
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
import { BoardRules } from "./board-rules";
import { BoardTiles } from "./board-tiles";
import { CloseBoardForm } from "./close-board-form";
import { JoinCode } from "./join-code";
import { QrCard } from "./qr-card";
import { RenameBoard } from "./rename-board";
import { SettingsShelf } from "./settings-shelf";
import { TimeZone } from "./time-zone";
import {
  listBlockedAccounts,
  listBoardTiles,
  listReportedTiles,
  requireOwnedVenue,
} from "./venue";

export const metadata: Metadata = { title: "Your board · DrawPin" };

/** A small inked card in the sharing column, as wide as the QR card. */
const SMALL_CARD =
  "border-foreground flex flex-col rounded-xl border-2 bg-white p-4 shadow-[4px_4px_0_var(--primary)]";

/** A light, secondary button on the cards. */
const QUIET_BUTTON =
  "border-foreground hover:bg-secondary focus-visible:ring-highlight inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 bg-white px-4 text-sm font-bold outline-none focus-visible:ring-3";

/**
 * The owner's screen (docs/PLAN.md, Owner admin), in the boards' look (UI
 * pass, 2026-10-05): the board's blue header, then two columns on a laptop.
 * One is for sharing the board: the QR card with the ways to print it, the
 * board's code and its link. The other is the week's drawings, with reported
 * ones flagged among them and a line at the top when there are any, since
 * they're the only part that needs the owner to do something. Settings set
 * once and rarely revisited (name, time zone, rules, pausing, blocked
 * accounts, closing) fold into Board settings under the drawings.
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
      {/* Hard to miss while it lasts: nobody can post until it's undone. */}
      {venue.isPaused && (
        <div className="border-foreground flex items-center justify-between gap-3 rounded-xl border-2 bg-white py-2 pr-2 pl-4 shadow-[4px_4px_0_var(--winner)]">
          <p className="flex items-center gap-2.5 text-sm">
            <span
              aria-hidden
              className="border-foreground bg-winner size-3 shrink-0 rounded-full border-2"
            />
            <span>
              <span className="font-black">Board paused.</span> People
              can&apos;t post.
            </span>
          </p>
          <PauseButton paused />
        </div>
      )}

      {/* A phone gets one column, the sharing pieces first. On a laptop
          they are a column as wide as the printed card, beside the drawings.
          It stays in view while they scroll only on a screen tall enough to
          show all of it; on a shorter one, sticking would hide its end. */}
      <div className="grid items-start gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside
          aria-label="Share your board"
          className="mx-auto flex w-full max-w-sm flex-col gap-5 lg:max-w-none lg:[@media(min-height:72rem)]:sticky lg:[@media(min-height:72rem)]:top-6"
        >
          <QrCard name={venue.name} url={url} svg={qr.svg} code={code} />
          <div className="flex flex-col gap-2.5">
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

          <div className={SMALL_CARD}>
            <JoinCode code={code} />
          </div>

          <div className={SMALL_CARD}>
            <BoardLink
              url={url}
              matchesName={slugMatchesName(venue.slug, venue.name)}
              nextUrl={`${new URL("/b/", serverEnv().SITE_URL)}${slugifyVenueName(venue.name)}-····`}
            />
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-8">
          <BoardTiles tiles={tiles} reported={reported} />

          {/* Settings an owner sets once and rarely revisits, each folded to a
              line saying what it's set to. Closing the board is last: it can't
              be undone. */}
          <section
            aria-labelledby="board-settings"
            className="border-foreground overflow-hidden rounded-xl border-2 bg-white shadow-[4px_4px_0_var(--primary)]"
          >
            <h2
              id="board-settings"
              className="px-5 pt-5 pb-3 font-black tracking-tight"
            >
              Board settings
            </h2>

            <SettingsShelf
              id="board-name"
              title="Board name"
              summary={venue.name}
            >
              <RenameBoard name={venue.name} />
            </SettingsShelf>

            {/* Each time is shown in the zone it falls in: a change's start in the
                zone it ends, a new zone's first week in the new zone. */}
            <SettingsShelf
              id="time-zone"
              title="Time zone"
              summary={
                clock.scheduled
                  ? `${zoneName(clock.timeZone)}, then ${zoneName(clock.scheduled.timeZone)}`
                  : zoneName(clock.timeZone)
              }
            >
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
                nextChangeFrom={formatBoundary(
                  clock.nextChangeFrom,
                  clock.timeZone,
                )}
              />
            </SettingsShelf>

            <SettingsShelf
              id="board-rules"
              title="Board rules"
              summary={MODERATION_LEVEL_INFO[venue.moderationLevel].name}
            >
              <BoardRules level={venue.moderationLevel} />
            </SettingsShelf>

            <SettingsShelf
              id="pause-board"
              title="Pause board"
              summary={venue.isPaused ? "Paused" : "Open"}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-muted-foreground text-sm">
                  {venue.isPaused
                    ? "People can see the board but can't post."
                    : "People can post to the board."}
                </p>
                <PauseButton paused={venue.isPaused} />
              </div>
            </SettingsShelf>

            {blocked.length > 0 && (
              <SettingsShelf
                id="blocked-accounts"
                title="Blocked accounts"
                summary={String(blocked.length)}
              >
                <BlockedAccounts accounts={blocked} />
              </SettingsShelf>
            )}

            <SettingsShelf id="close-board" title="Close board" danger>
              <CloseBoardForm name={venue.name} />
            </SettingsShelf>
          </section>
        </div>
      </div>
    </BoardLayout>
  );
}

/** A time zone as people read it: "America/New York". */
function zoneName(zone: string): string {
  return zone.replaceAll("_", " ");
}

/** Pauses the board, or resumes posting when it's paused. */
function PauseButton({ paused }: { paused: boolean }) {
  return (
    <form action={setBoardPaused} className="shrink-0">
      <input type="hidden" name="paused" value={paused ? "false" : "true"} />
      <button
        type="submit"
        className={cn(
          paused ? INKED_BUTTON : QUIET_BUTTON,
          "h-11 px-3.5 text-sm",
        )}
      >
        {paused ? "Resume posting" : "Pause board"}
      </button>
    </form>
  );
}
