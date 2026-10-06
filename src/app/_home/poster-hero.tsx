"use client";

import Link from "next/link";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { HEADER_BUTTON, INKED_BUTTON } from "../b/[slug]/board-look";
import { PinnedDrawing } from "../b/[slug]/pinned-drawing";
import { EXAMPLE, TrophyBadge } from "./shared";

/**
 * Where each drawing is pinned on the poster, desktop only: overlapping the
 * edges of the type, at a slant, like a wall someone's been at. On a phone
 * they sit in a scattered row under it instead. The top one sits low
 * enough for its pin to stick out above it inside the poster, which clips.
 */
const SPOTS = [
  "md:absolute md:top-10 md:right-[4%] md:w-40 md:rotate-2",
  "md:absolute md:top-[44%] md:right-[22%] md:w-40 md:-rotate-1",
  "md:absolute md:bottom-6 md:right-[3%] md:w-40 md:rotate-1",
];

/**
 * The poster itself, on its own for a page that goes on from it (chosen
 * from prototypes on 2026-10-05, "Framed"). The page stays white from top to
 * bottom and the blue is a poster on it: an inked card with rounded corners
 * and the same offset shadow as the "Start a board" card at the end, rather
 * than a band of colour starting and stopping across the page. No bar
 * above it: the poster is the top of the page.
 */
export function PosterHero() {
  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-3 pt-3 md:px-6 md:pt-6">
        <header className="bg-primary text-primary-foreground border-foreground overflow-hidden rounded-2xl border-2 shadow-[6px_6px_0_var(--foreground)]">
          <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 pt-8 pb-10 md:min-h-[28rem] md:justify-center">
            <h1 className="relative z-10 text-[clamp(4rem,14vw,10rem)] leading-[0.86] font-black tracking-tighter">
              Draw it.
              <br />
              <span className="text-winner">Pin it.</span>
            </h1>
            <p className="relative z-10 max-w-md text-lg text-white/85">
              One drawing a day. Everyone votes. One winner a week.
            </p>
            <div className="relative z-10 flex flex-wrap gap-3">
              <a href="#join" className={`draw-awake ${INKED_BUTTON}`}>
                <PencilSimpleIcon weight="bold" className="size-5" />I have a
                code
              </a>
              <Link href="/login" className={`${HEADER_BUTTON} text-base`}>
                Start a board
              </Link>
            </div>

            <ul className="grid grid-cols-3 gap-3 pt-6 md:contents">
              {EXAMPLE.slice(0, 3).map((tile, index) => (
                <li key={tile.id} className={`min-w-0 ${SPOTS[index]}`}>
                  <PinnedDrawing
                    tile={tile}
                    index={index}
                    badge={index === 0 ? <TrophyBadge size={40} /> : undefined}
                  />
                </li>
              ))}
            </ul>
          </div>
        </header>
      </div>
    </>
  );
}
