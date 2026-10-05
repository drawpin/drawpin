import Image from "next/image";
import Link from "next/link";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { HEADER_BUTTON, INKED_BUTTON } from "../../b/[slug]/board-look";
import { Drawings, RestOfPage, TryLink, Wordmark } from "./shared";

/**
 * The page's own colour, tied to the scroll: blue at the top, white by the
 * time the hero has gone. A white copy of the logo sits over the coloured
 * one on the blue and fades away as the page whitens. The hero fills the first screen, so
 * nothing dark sits on the blue. Browsers without scroll timelines get a
 * plain blue hero on white.
 */
const CSS = `
.sf-page { background: #fff; }
.sf-hero { background: var(--primary); }
@supports (animation-timeline: scroll()) {
  .sf-page {
    animation: sf-page linear both;
    animation-timeline: scroll(root);
    animation-range: 0 60vh;
  }
  .sf-hero { background: transparent; }
  .sf-logo-white {
    animation: sf-out linear both;
    animation-timeline: scroll(root);
    animation-range: 10vh 40vh;
  }
}
.sf-logo-white { filter: brightness(0) invert(1); }
@keyframes sf-page { from { background: #004aad; } to { background: #fff; } }
@keyframes sf-out { to { opacity: 0; } }
`;

/**
 * Scroll fade: one full-bleed blue, the logo on it with no bar at all, and
 * the change to white happening as you scroll rather than at an edge.
 */
export function ScrollFade() {
  return (
    <div className="sf-page flex flex-1 flex-col">
      <style>{CSS}</style>
      {/* The bar shares the page's colour, so it never shows as a band. */}
      <nav className="sf-page sticky top-0 z-30">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-2">
          <span className="relative">
            <Wordmark src="/wordmark-cutout.webp" />
            <Image
              src="/wordmark-cutout.webp"
              alt=""
              width={463}
              height={152}
              unoptimized
              className="sf-logo-white pointer-events-none absolute inset-0 h-8 w-auto"
            />
          </span>
          <TryLink />
        </div>
      </nav>
      <header className="sf-hero text-primary-foreground overflow-hidden">
        <div className="relative mx-auto flex min-h-[calc(100svh-3.5rem)] w-full max-w-5xl flex-col justify-center gap-6 px-5 pt-6 pb-14">
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
          <Drawings />
        </div>
      </header>
      <RestOfPage />
    </div>
  );
}
