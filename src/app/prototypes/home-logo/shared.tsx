"use client";

import Image from "next/image";
import Link from "next/link";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { HEADER_BUTTON, INKED_BUTTON } from "../../b/[slug]/board-look";
import { ReviewStack } from "../../_home/review-stack";
import { Ending } from "../../_home/shared";
import { TryItPlay } from "../../_home/try-it";
import { NOTE, SECTION_TITLE } from "../../_home/type";
import { WeekStory } from "../../_home/week-story";

/**
 * The wordmark cut out of its white background (white letters, ink edges,
 * the pen for the i), for sitting on the blue. `className` sizes it.
 */
export function Logo({ className = "h-12 w-auto" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="DrawPin home"
      className="focus-visible:ring-highlight inline-block rounded-lg outline-none focus-visible:ring-3"
    >
      <Image
        src="/wordmark-cutout.webp"
        alt="DrawPin"
        width={926}
        height={304}
        unoptimized
        loading="eager"
        className={className}
      />
    </Link>
  );
}

/** The poster's headline, line and buttons, as on the real page. */
export function Pitch() {
  return (
    <>
      <h1 className="relative z-10 text-[clamp(4rem,13vw,9rem)] leading-[0.86] font-black tracking-tighter">
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
    </>
  );
}

/** The framed blue poster, with a little room around it on the white page. */
export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-3 pt-3 md:px-6 md:pt-6">
      <header className="bg-primary text-primary-foreground border-foreground relative overflow-hidden rounded-2xl border-2 shadow-[6px_6px_0_var(--foreground)]">
        {children}
      </header>
    </div>
  );
}

/**
 * The page under the poster, as on the real page, but with less space
 * above and below the try-it canvas.
 */
export function RestOfPage() {
  return (
    <>
      <section id="try" className="scroll-mt-4 py-10">
        <TryItPlay />
      </section>
      <section className="flex flex-col gap-4 py-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-5">
          <p className={NOTE}>Then, every week</p>
          <h2 className={SECTION_TITLE}>A week on a board.</h2>
        </div>
        <WeekStory />
      </section>
      <section className="flex flex-col gap-6 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-5">
          <p className={NOTE}>From real boards</p>
          <h2 className={SECTION_TITLE}>What people say.</h2>
        </div>
        <ReviewStack />
      </section>
      <Ending />
    </>
  );
}
