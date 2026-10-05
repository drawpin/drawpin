import Link from "next/link";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { HEADER_BUTTON, INKED_BUTTON } from "../../b/[slug]/board-look";
import { Drawings, RestOfPage, TryLink, Wordmark } from "./shared";

/**
 * Framed: the page is white from top to bottom, and the blue is a poster on
 * it, an inked card with rounded corners and the same offset shadow as the
 * "Start a board" card at the bottom. No bar: the logo sits on the page.
 */
export function Framed() {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-2">
        <Wordmark />
        <TryLink />
      </nav>
      <div className="mx-auto w-full max-w-6xl px-3 md:px-5">
        <header className="bg-primary text-primary-foreground border-foreground overflow-hidden rounded-2xl border-2 shadow-[6px_6px_0_var(--foreground)]">
          <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 pt-8 pb-10 md:min-h-[28rem] md:justify-center">
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
            <Drawings />
          </div>
        </header>
      </div>
      <RestOfPage />
    </div>
  );
}
