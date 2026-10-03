import Image from "next/image";
import { pinColorFor, pinStyle } from "@/components/pin";
import { hand } from "@/lib/fonts";
import { describeTile } from "../tile-caption";
import type { Tile } from "../tiles";

/** A drawing on the podium: its place (1 to 3) and its votes so far. */
export type Leader = { place: 1 | 2 | 3; tile: Tile; votes: number };

/**
 * Each place's step: how tall it stands, its colour (a fill with ink text,
 * never a text colour), and when it rises. The steps go up 3rd, 2nd, then
 * 1st, so the leader arrives last.
 */
const STEPS = {
  1: { height: "h-28", fill: "bg-winner", delay: 360 },
  2: { height: "h-20", fill: "bg-highlight", delay: 180 },
  3: { height: "h-14", fill: "bg-attention", delay: 0 },
} as const;

/** In place order for screen readers; CSS `order` lays them out 2nd, 1st, 3rd. */
const PLACES = [1, 2, 3] as const;

/** Where each place stands, left to right, as on a real podium. */
const SPOT = { 1: 1, 2: 0, 3: 2 } as const;

/**
 * The top 3 so far, Kahoot style, at the head of the vote page: vote counts
 * are public while voting is open, so the race stays worth watching all week
 * (docs/PLAN.md, Weekly cycle; ADR-008). The order is the one that will pick
 * the winner. A place nobody holds yet stands empty.
 *
 * Seen once a visit, so it gets an entrance: each step rises, then its
 * drawing's pin goes in. Off for reduced motion (globals.css).
 */
export function Podium({ leaders }: { leaders: Leader[] }) {
  if (leaders.length === 0) {
    return (
      <p className="bg-winner text-foreground w-fit -rotate-1 px-4 py-2 font-semibold shadow-[0_2px_3px_rgb(15_27_45/0.18),0_6px_12px_rgb(15_27_45/0.14)]">
        No votes yet. Yours could put a drawing on top.
      </p>
    );
  }

  return (
    <section aria-labelledby="podium-heading" className="flex flex-col gap-3">
      <h2
        id="podium-heading"
        className={`${hand.className} text-primary text-3xl leading-none font-bold`}
      >
        Top 3 so far
      </h2>
      <ol className="grid grid-cols-3 items-end gap-2 overflow-hidden pt-8">
        {PLACES.map((place) => {
          const leader = leaders.find((entry) => entry.place === place);
          const step = STEPS[place];
          return (
            <li
              key={place}
              style={{ order: SPOT[place] }}
              className="flex min-w-0 flex-col items-center gap-2"
              aria-label={
                leader
                  ? `${ordinal(place)}: ${describeTile(leader.tile)}, ${votesLabel(leader.votes)}`
                  : `${ordinal(place)}: nobody yet`
              }
            >
              {leader ? (
                <div
                  className="pinned pin-pop relative w-[86%] bg-white p-1 shadow-[0_2px_3px_rgb(15_27_45/0.14),0_10px_20px_rgb(0_74_173/0.14)]"
                  style={{
                    ...pinStyle(pinColorFor(leader.tile.id), step.delay + 420),
                    rotate:
                      place === 1 ? "0deg" : place === 2 ? "-3deg" : "3deg",
                  }}
                >
                  <Image
                    src={leader.tile.imageUrl}
                    alt=""
                    width={256}
                    height={256}
                    // Tiles are already small WebP files from the storage CDN.
                    unoptimized
                    className="aspect-square w-full object-cover"
                  />
                </div>
              ) : null}
              <p className="text-foreground w-full truncate text-center text-xs font-bold">
                {leader ? (leader.tile.author?.split("#")[0] ?? "Guest") : ""}
              </p>
              <div
                className={`podium-rise ${step.height} ${step.fill} border-foreground text-foreground flex w-full flex-col items-center justify-center rounded-t-lg border-2 border-b-0`}
                style={{ animationDelay: `${step.delay}ms` }}
              >
                <span className="text-2xl leading-none font-black">
                  {place}
                </span>
                {leader && (
                  <span className="text-xs font-bold tabular-nums">
                    {votesLabel(leader.votes)}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ordinal(place: 1 | 2 | 3): string {
  return place === 1 ? "1st" : place === 2 ? "2nd" : "3rd";
}

function votesLabel(votes: number): string {
  return `${votes} ${votes === 1 ? "vote" : "votes"}`;
}
