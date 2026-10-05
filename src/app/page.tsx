import type { Viewport } from "next";
import { YELLOW_STRIP } from "./b/[slug]/board-look";
import { PosterHero } from "./_home/poster-hero";
import { Ending } from "./_home/shared";
import { TryItPlay } from "./_home/try-it";
import { WeekStory } from "./_home/week-story";

/** The phone's status bar matches the blue hero, as on a board. */
export const viewport: Viewport = { themeColor: "#004aad" };

/**
 * The home page (UI pass, chosen from prototypes on 2026-10-05, "All
 * three"): three answers to "why start?" in the order a visitor needs them.
 * The poster lands the idea in one glance; trying it gets them drawing on the
 * spot, onto an example board; and the week shows what happens next, from the
 * first drawing to the winner's trophy. Then the code, starting a board, and
 * the owner's own story, word for word.
 */
export default function Home() {
  return (
    <div data-board className="flex flex-1 flex-col">
      <PosterHero />
      <section id="try" className="scroll-mt-4 pt-8">
        <TryItPlay tone="tint" />
      </section>
      <section className="flex flex-col">
        <div className="mx-auto w-full max-w-5xl px-5">
          <h2 className={`${YELLOW_STRIP} text-3xl`}>Then, every week</h2>
        </div>
        <WeekStory />
      </section>
      <Ending />
    </div>
  );
}
