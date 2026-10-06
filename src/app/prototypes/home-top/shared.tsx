"use client";

import Image from "next/image";
import Link from "next/link";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { PinnedDrawing } from "../../b/[slug]/pinned-drawing";
import { ReviewStack } from "../../_home/review-stack";
import { EXAMPLE, Ending, TrophyBadge } from "../../_home/shared";
import { TryItPlay } from "../../_home/try-it";
import { NOTE, OUTLINE_BUTTON, SECTION_TITLE } from "../../_home/type";
import { WeekStory } from "../../_home/week-story";

/** Where each drawing is pinned on the poster, desktop only, as on the real page. */
const SPOTS = [
  "md:absolute md:top-6 md:right-[4%] md:w-40 md:rotate-2",
  "md:absolute md:top-[44%] md:right-[22%] md:w-40 md:-rotate-1",
  "md:absolute md:bottom-6 md:right-[3%] md:w-40 md:rotate-1",
];

/** The three example drawings, pinned on the poster. */
export function Drawings() {
  return (
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
  );
}

/** The wordmark, linking home. */
export function Wordmark() {
  return (
    <Link
      href="/"
      aria-label="DrawPin home"
      className="focus-visible:ring-highlight rounded-lg outline-none focus-visible:ring-3"
    >
      <Image
        src="/wordmark.webp"
        alt="DrawPin"
        width={463}
        height={152}
        unoptimized
        className="h-8 w-auto"
      />
    </Link>
  );
}

/** The small "Try it" link to the canvas. */
export function TryLink() {
  return (
    <a href="#try" className={`${OUTLINE_BUTTON} h-10 px-3 text-sm`}>
      <PencilSimpleIcon weight="bold" className="size-4" />
      Try it
    </a>
  );
}

/** Everything under the hero, unchanged from the real home page. */
export function RestOfPage() {
  return (
    <>
      <section id="try" className="scroll-mt-16 py-14">
        <TryItPlay />
      </section>
      <section className="flex flex-col gap-4 py-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-4 px-5">
          <p className={NOTE}>Then, every week</p>
          <h2 className={SECTION_TITLE}>A week on a board.</h2>
        </div>
        <WeekStory />
      </section>
      <section className="flex flex-col gap-6 py-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-4 px-5">
          <p className={NOTE}>From real boards</p>
          <h2 className={SECTION_TITLE}>What people say.</h2>
        </div>
        <ReviewStack />
      </section>
      <Ending />
    </>
  );
}
