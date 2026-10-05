import type { ReactNode } from "react";
import { WeekStory } from "../../_home/week-story";
import { Ending } from "../../_home/shared";
import { NOTE, SECTION_TITLE } from "../../_home/type";

/**
 * The home page around the section being tried: the end of the week story
 * above it, and the ending (with "Why I made this") below.
 */
export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
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
        {children}
      </section>
      <Ending />
    </div>
  );
}
