import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import type { WeekPeek } from "./data";

/** How many of last week's drawings the card fans out; the rest are "+N". */
export const PEEK_COUNT = 5;

/** A slight lean for each fanned drawing, like a hand of cards. */
const LEANS = [-4, 2.8, 1.6, -2.4, 4];

/**
 * The way into voting while last week is up for a vote: a card at the top
 * of the board, its drawings fanned out, with how many votes are
 * left and when voting closes. Showing what you'd vote on is the invitation
 * (2026-09-28); the inked look is from the UI pass (2026-10-02). Only
 * drawings are pinned up, so the card isn't.
 *
 * It stays awake (globals.css, `vote-awake`): every few seconds the drawings
 * hop one after another, like being shuffled, and the arrow nudges. Under a
 * mouse the card lifts; pressed, it sinks onto its shadow.
 */
export function VotePeek({
  href,
  peek,
  votesLeft,
  closesOn,
}: {
  href: string;
  peek: WeekPeek;
  votesLeft: number;
  /** The weekday voting closes, in the board's time zone. */
  closesOn: string;
}) {
  const more = peek.total - peek.imageUrls.length;

  return (
    <Link
      href={href}
      // The board switches to its vote view in place, header and all.
      scroll={false}
      className="vote-awake motion-safe:animate-fade-up border-foreground focus-visible:ring-highlight relative flex flex-col gap-3 rounded-xl border-2 bg-white p-4 shadow-[5px_5px_0_var(--primary)] transition-[translate,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] outline-none hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_var(--primary)] focus-visible:ring-3 active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0_var(--primary)] active:duration-75 motion-reduce:transition-none"
    >
      <span className="flex gap-1.5" aria-hidden>
        {peek.imageUrls.map((url, index) => (
          <Image
            key={url}
            src={url}
            alt=""
            width={48}
            height={48}
            // Already small WebP files from the storage CDN, like the feed.
            unoptimized
            className="peek border-foreground/20 size-11 rounded-md border bg-white object-cover"
            style={{
              transform: `rotate(${LEANS[index % LEANS.length]}deg)`,
              animationDelay: `${1.6 + index * 0.12}s`,
            }}
          />
        ))}
        {more > 0 && (
          <span className="bg-secondary text-primary grid size-11 place-items-center rounded-md text-sm font-bold">
            +{more}
          </span>
        )}
      </span>
      <span className="flex items-end justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-xl leading-tight font-black">
            Vote for last week&apos;s best
          </span>
          <span className="text-muted-foreground block text-sm font-semibold">
            {votesLeft} {votesLeft === 1 ? "vote" : "votes"} left, closes{" "}
            {closesOn}
          </span>
        </span>
        <span className="arrow bg-primary text-primary-foreground grid size-11 shrink-0 place-items-center rounded-full">
          <ArrowRightIcon weight="bold" className="size-5" />
        </span>
      </span>
    </Link>
  );
}
