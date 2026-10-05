import Link from "next/link";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { INKED_BUTTON } from "../../b/[slug]/board-look";
import { OUTLINE_BUTTON } from "../../_home/type";
import { Drawings, RestOfPage, TryLink, Wordmark } from "./shared";

/**
 * All white: no blue band at all, so there's no colour change to make. The
 * blue moves into the ink: "Draw it." in blue, "Pin it." under a yellow
 * highlighter stroke, like the "Go on, try it" notes further down.
 */
export function AllWhite() {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-2">
        <Wordmark />
        <TryLink />
      </nav>
      <header className="overflow-hidden">
        <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 pt-6 pb-10 md:min-h-[30rem] md:justify-center">
          <h1 className="relative z-10 text-[clamp(4rem,15vw,10.5rem)] leading-[0.86] font-black tracking-tighter">
            <span className="text-primary">Draw it.</span>
            <br />
            <span className="relative inline-block">
              <span
                aria-hidden
                className="bg-winner absolute inset-x-[-0.06em] top-[0.42em] bottom-[0.02em] -z-10 -rotate-1 rounded-[0.08em]"
              />
              Pin it.
            </span>
          </h1>
          <p className="text-muted-foreground relative z-10 max-w-md text-lg">
            One drawing a day. Everyone votes. One winner a week.
          </p>
          <div className="relative z-10 flex flex-wrap gap-3">
            <a href="#join" className={`draw-awake ${INKED_BUTTON}`}>
              <PencilSimpleIcon weight="bold" className="size-5" />I have a code
            </a>
            <Link href="/login" className={OUTLINE_BUTTON}>
              Start a board
            </Link>
          </div>
          <Drawings />
        </div>
      </header>
      <RestOfPage />
    </div>
  );
}
