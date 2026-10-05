"use client";

import Link from "next/link";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { HEADER_BUTTON, INKED_BUTTON } from "../b/[slug]/board-look";
import { PinnedDrawing } from "../b/[slug]/pinned-drawing";
import { EXAMPLE, Nav, TrophyBadge } from "./shared";

/**
 * Where each drawing is pinned on the poster, desktop only: overlapping the
 * edges of the type, at a slant, like a wall someone's been at. On a phone
 * they sit in a scattered row under it instead.
 */
const SPOTS = [
  "md:absolute md:top-4 md:right-[4%] md:w-40 md:rotate-2",
  "md:absolute md:top-[44%] md:right-[22%] md:w-40 md:-rotate-1",
  "md:absolute md:bottom-6 md:right-[3%] md:w-40 md:rotate-1",
];

/**
 * The poster itself, on its own for a page that goes on from it. Its blue
 * fades in from the white bar above and back out to the white page below,
 * instead of starting and stopping on a hard edge.
 */
export function PosterHero() {
  return (
    <>
      <Nav />
      <header className="bg-primary text-primary-foreground overflow-hidden">
        <div
          aria-hidden
          className="to-primary h-20 bg-linear-to-b from-white"
        />
        <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 pt-2 pb-10 md:min-h-[30rem] md:justify-center">
          <h1 className="relative z-10 text-[clamp(4rem,15vw,10.5rem)] leading-[0.86] font-black tracking-tighter">
            Draw it.
            <br />
            <span className="text-winner">Pin it.</span>
          </h1>
          <p className="relative z-10 max-w-md text-lg text-white/85">
            One drawing a day. Everyone votes. One winner a week.
          </p>
          <div className="relative z-10 flex flex-wrap gap-3">
            <a href="#join" className={`draw-awake ${INKED_BUTTON}`}>
              <PencilSimpleIcon weight="bold" className="size-5" />I have a code
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
        <div
          aria-hidden
          className="from-primary h-32 bg-linear-to-b to-white"
        />
      </header>
    </>
  );
}
