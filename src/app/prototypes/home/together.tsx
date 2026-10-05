"use client";

import { hand } from "@/lib/fonts";
import { YELLOW_STRIP } from "../../b/[slug]/board-look";
import { PosterHero } from "./poster";
import { Ending } from "./shared";
import { TryItPlay } from "./try-it";
import { WeekStory } from "./week";

/**
 * All three, in the order a visitor needs them: the poster lands the idea in
 * one glance, trying it gets them drawing, and the week shows what happens
 * next, before the shared ending. Axis: the three directions as one page.
 */
export function Together() {
  return (
    <div data-board className="flex min-h-dvh flex-col">
      <PosterHero />
      <section className="pt-14">
        <TryItPlay tone="tint" />
      </section>
      <section className="flex flex-col">
        <div className="mx-auto w-full max-w-5xl px-5">
          <h2 className={`${YELLOW_STRIP} text-3xl`}>Then, every week</h2>
          <p className={`${hand.className} text-muted-foreground pt-2 text-xl`}>
            scroll through one
          </p>
        </div>
        <WeekStory />
      </section>
      <Ending />
    </div>
  );
}
