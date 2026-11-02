import { ShellTopBar } from "@/components/app-shell/shell-frame";
import { Feedback } from "./feedback";
import { PosterHero } from "./poster-hero";
import { ReviewStack } from "./review-stack";
import { Ending } from "./shared";
import { TryItPlay } from "./try-it";
import { NOTE, SECTION_TITLE } from "./type";
import { WeekStory } from "./week-story";

/**
 * The marketing home (UI pass, chosen from prototypes on 2026-10-05, "All
 * three"): three answers to "why start?" in the order a visitor needs them.
 * The poster lands the idea in one glance; trying it gets them drawing on the
 * spot, and shows their drawing winning; and the week shows what happens
 * next, from the first drawing to the winner's trophy. Then what people
 * using it say, the code, starting a board, the owner's own story, and
 * last a place to send ideas and bugs.
 *
 * White under the blue hero, not the boards' blue-grey tint: straight from
 * the deep blue, the tint read as a muddy change of colour.
 *
 * It is `/` for anyone not landing on the hub, and `/about` for everyone
 * (src/lib/landing.ts).
 */
export function MarketingHome() {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <ShellTopBar />
      <PosterHero />
      <section id="try" className="scroll-mt-4 py-14">
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
      <Feedback />
    </div>
  );
}
