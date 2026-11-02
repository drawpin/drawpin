import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  PencilSimpleIcon,
  PushPinIcon,
} from "@phosphor-icons/react/ssr";
import { OwnerChip, StatusLine } from "@/components/board-status";
import { pinColorFor, pinStyle } from "@/components/pin";
import type { HubBoard } from "@/lib/home-hub";
import { PAPER } from "../b/[slug]/board-look";
import { SectionHead } from "./section-head";

/** Each of a card's three papers leans a little its own way. */
const LEANS = [-1.5, 1, -0.6];

/** The pins push in one after another, 60ms apart, across the cards. */
const PIN_STAGGER_MS = 60;

/** A board as a card: its latest three drawings pinned up, then its name. */
function BoardCard({ board, order }: { board: HubBoard; order: number }) {
  const pinned = board.pinnedAt !== null;
  return (
    <li className="w-[78%] shrink-0 snap-start sm:w-auto">
      <Link
        href={`/b/${encodeURIComponent(board.slug)}`}
        className="border-foreground focus-visible:ring-highlight flex h-full flex-col gap-4 rounded-xl border-2 bg-white p-4 pt-6 shadow-[5px_5px_0_var(--primary)] transition-[translate,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] outline-none focus-visible:ring-3 active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0_var(--primary)] motion-reduce:transition-none [@media(hover:hover)]:hover:-translate-x-0.5 [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:shadow-[7px_7px_0_var(--primary)]"
      >
        {board.latest.length > 0 ? (
          <span className="grid grid-cols-3 gap-2.5" aria-hidden>
            {board.latest.map((url, index) => (
              <span
                key={url}
                className={`pinned pin-pop relative block p-1 ${PAPER}`}
                style={
                  {
                    ...pinStyle(pinColorFor(board.slug + index)),
                    "--pin-scale": 0.7,
                    "--pin-delay": `${(order * 3 + index) * PIN_STAGGER_MS}ms`,
                    rotate: `${LEANS[index]}deg`,
                  } as CSSProperties
                }
              >
                <Image
                  src={url}
                  alt=""
                  width={160}
                  height={160}
                  unoptimized
                  className="aspect-square w-full object-cover"
                />
              </span>
            ))}
          </span>
        ) : (
          <span
            aria-hidden
            className={`text-muted-foreground flex aspect-[3/1] items-center justify-center gap-2 text-sm font-semibold ${PAPER}`}
          >
            <PencilSimpleIcon weight="bold" className="size-4" />
            No drawings yet
          </span>
        )}
        <span className="flex flex-col gap-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-lg leading-tight font-black tracking-tight">
              {board.name}
            </span>
            {pinned && (
              <PushPinIcon
                weight="fill"
                aria-label="Pinned"
                className="text-primary size-4 shrink-0"
              />
            )}
            {board.owned && <OwnerChip />}
          </span>
          {board.drawingsThisWeek !== null && (
            <span className="text-muted-foreground text-sm">
              {board.drawingsThisWeek}{" "}
              {board.drawingsThisWeek === 1 ? "drawing" : "drawings"} this week
            </span>
          )}
          <StatusLine
            status={board.status}
            votesLeft={board.votesLeft}
            revealIds={board.revealIds}
            lastVisitedAt={board.lastVisitedAt}
          />
        </span>
      </Link>
    </li>
  );
}

/**
 * "Your boards": every board the account has, pinned first, as cards. On a
 * phone they scroll sideways, the next card peeking in to show they do; from
 * `sm` they're a grid. The sidebar's "All your boards" links here
 * (`/#boards`).
 */
export function BoardsSection({
  boards,
  runs,
}: {
  boards: HubBoard[];
  /** How many boards the account runs: "Manage" goes to them. */
  runs: number;
}) {
  return (
    <section
      id="boards"
      className="flex scroll-mt-6 flex-col gap-5"
      aria-labelledby="hub-boards"
    >
      <SectionHead
        id="hub-boards"
        note="Pinned first"
        title="Your boards"
        action={
          runs > 0 ? (
            <Link
              href="/admin"
              className="text-primary focus-visible:ring-highlight inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-sm font-bold outline-none hover:underline focus-visible:ring-3"
            >
              Manage
              <ArrowRightIcon weight="bold" className="size-4" />
            </Link>
          ) : undefined
        }
      />
      {boards.length > 0 ? (
        <ul className="-mx-5 flex snap-x snap-mandatory scroll-px-5 [scrollbar-width:none] gap-5 overflow-x-auto px-5 pt-1 pb-3 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-y-6 sm:overflow-visible sm:px-0 xl:grid-cols-3 [&::-webkit-scrollbar]:hidden">
          {boards.map((board, index) => (
            <BoardCard key={board.venueId} board={board} order={index} />
          ))}
        </ul>
      ) : (
        <p className="border-foreground/30 text-muted-foreground rounded-xl border-2 border-dashed px-5 py-8 text-center">
          No boards yet. Scan a board&apos;s QR code, or type its code below.
        </p>
      )}
    </section>
  );
}
