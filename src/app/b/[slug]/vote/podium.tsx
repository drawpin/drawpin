import Image from "next/image";
import { pinColorFor, pinStyle } from "@/components/pin";
import { hand } from "@/lib/fonts";
import { describeTile } from "../tile-caption";
import type { Tile } from "../tiles";
import { ScribbleFill } from "./scribbles";

/** A drawing on the podium: its place (1 to 3) and its votes so far. */
export type Leader = { place: 1 | 2 | 3; tile: Tile; votes: number };

/**
 * Each place's step: how tall it stands (px), its colour (scribbled in,
 * with ink text on it), its trophy (made in Canva, 2026-10-03: gold,
 * silver, bronze), and when it rises. The steps go up 3rd, 2nd, then 1st,
 * so the leader arrives last.
 */
const STEPS = {
  1: {
    height: 144,
    color: "text-winner",
    trophy: "gold",
    size: 64,
    delay: 360,
  },
  2: {
    height: 112,
    color: "text-highlight",
    trophy: "silver",
    size: 52,
    delay: 180,
  },
  3: {
    height: 96,
    color: "text-attention",
    trophy: "bronze",
    size: 46,
    delay: 0,
  },
} as const;

/** How long after a step starts rising its colour starts being scribbled in. */
const SCRIBBLE_AFTER_RISE = 480;
/** How long the scribbling takes on the tallest step; shorter ones are quicker. */
const SCRIBBLE_MS = 900;

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
 * Each step carries a trophy instead of a number, sized by place. Seen once
 * a visit, so it gets an entrance: each step rises white, its colour is
 * scribbled in like crayon, and its drawing's pin goes in. Off for reduced
 * motion, where the steps are simply coloured in (globals.css).
 */
export function Podium({
  leaders,
  heading = "Top 3 so far",
}: {
  leaders: Leader[];
  /** Over the podium; the home page's "what could be" says something else. */
  heading?: string;
}) {
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
        {heading}
      </h2>
      <ol className="border-foreground grid grid-cols-3 items-end gap-2 overflow-hidden border-b-2 pt-8">
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
              ) : (
                // A place nobody holds yet: an empty paper waiting for a
                // drawing, so the podium never looks half built.
                <div
                  aria-hidden
                  className="border-foreground/25 text-muted-foreground grid aspect-square w-[86%] place-items-center rounded-sm border-2 border-dashed bg-white/60 text-2xl font-black"
                  style={{
                    rotate: place === 2 ? "-3deg" : "3deg",
                  }}
                >
                  ?
                </div>
              )}
              <p
                className={`w-full truncate text-center text-xs font-bold ${leader ? "text-foreground" : "text-muted-foreground"}`}
              >
                {leader
                  ? (leader.tile.author?.split("#")[0] ?? "Guest")
                  : "Up for grabs"}
              </p>
              <div
                className="podium-rise border-foreground text-foreground relative flex w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-t-lg border-2 border-b-0 bg-white"
                style={{
                  height: step.height,
                  animationDelay: `${step.delay}ms`,
                }}
              >
                <ScribbleFill
                  delay={step.delay + SCRIBBLE_AFTER_RISE}
                  duration={Math.round((SCRIBBLE_MS * step.height) / 144)}
                  className={step.color}
                />
                {/* The trophy, with its place written on the cup. */}
                <span className="relative">
                  <Image
                    src={`/trophies/${step.trophy}.webp`}
                    alt=""
                    width={step.size}
                    height={step.size}
                    // Already small WebP files (public/trophies).
                    unoptimized
                  />
                  <span
                    aria-hidden
                    className="text-foreground absolute top-[31%] left-1/2 -translate-x-1/2 -translate-y-1/2 font-black tracking-tight"
                    style={{ fontSize: Math.round(step.size * 0.19) }}
                  >
                    {ordinal(place)}
                  </span>
                </span>
                {leader && (
                  <span className="relative text-xs font-bold tabular-nums">
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
