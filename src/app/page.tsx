import type { Viewport } from "next";
import { PosterHero } from "./_home/poster-hero";
import { ReviewStack } from "./_home/review-stack";
import { Ending } from "./_home/shared";
import { TryItPlay } from "./_home/try-it";
import { NOTE, SECTION_TITLE } from "./_home/type";
import { WeekStory } from "./_home/week-story";

/** The phone's status bar matches the blue hero, as on a board. */
export const viewport: Viewport = { themeColor: "#004aad" };

/**
 * The home page (UI pass, chosen from prototypes on 2026-10-05, "All
 * three"): three answers to "why start?" in the order a visitor needs them.
 * The poster lands the idea in one glance; trying it gets them drawing on the
 * spot, and shows their drawing winning; and the week shows what happens
 * next, from the first drawing to the winner's trophy. Then what people
 * using it say, the code, starting a board, and the owner's own story,
 * word for word.
 *
 * White under the blue hero, not the boards' blue-grey tint: straight from
 * the deep blue, the tint read as a muddy change of colour.
 */
export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <PosterHero />
      <section id="try" className="scroll-mt-4 py-14">
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
    </div>
  );
}
