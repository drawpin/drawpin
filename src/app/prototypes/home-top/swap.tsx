"use client";

import Link from "next/link";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { useEffect, useState, type ReactNode } from "react";
import { hand } from "@/lib/fonts";
import { HEADER_BUTTON, INKED_BUTTON } from "../../b/[slug]/board-look";
import { Drawings, RestOfPage, TryLink, Wordmark } from "./shared";

/** A pencil for a cursor, so the headline looks like something to touch. */
const PENCIL_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><path d='M4 28l2-7L22 5l5 5-16 16z' fill='#ffca39' stroke='#0f1b2d' stroke-width='2' stroke-linejoin='round'/><path d='M4 28l2-7 5 5z' fill='#0f1b2d'/></svg>`,
)}") 4 28, pointer`;

/**
 * Whether the headline shows "Pin it." yet: on a hover with a mouse, and on
 * its own every few seconds on a phone, which can't hover. With reduced
 * motion the phone doesn't loop.
 */
function useSwap() {
  const [on, setOn] = useState(false);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const touch = window.matchMedia("(hover: none)").matches;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!touch || still) return;
    const timer = window.setInterval(() => setOn((value) => !value), 2600);
    return () => window.clearInterval(timer);
  }, []);

  return {
    on,
    seen,
    handlers: {
      onPointerEnter: (event: React.PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        setOn(true);
        setSeen(true);
      },
      onPointerLeave: (event: React.PointerEvent) => {
        if (event.pointerType === "mouse") setOn(false);
      },
    },
  };
}

/**
 * The Framed poster with a word-swap headline: `render` draws "Draw it."
 * turning into "Pin it." for the given state. A handwritten "hover me" sits
 * by it on a computer until the first hover.
 */
export function SwapPoster({ render }: { render: (on: boolean) => ReactNode }) {
  const { on, seen, handlers } = useSwap();

  return (
    <div className="flex flex-1 flex-col bg-white">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-2">
        <Wordmark />
        <TryLink />
      </nav>
      <div className="mx-auto w-full max-w-6xl px-3 md:px-5">
        <header className="bg-primary text-primary-foreground border-foreground overflow-hidden rounded-2xl border-2 shadow-[6px_6px_0_var(--foreground)]">
          <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 pt-10 pb-10 md:min-h-[34rem] md:justify-center">
            <div className="relative z-10 self-start">
              <p
                aria-hidden
                className={`${hand.className} text-winner pointer-events-none absolute -top-7 left-[0.1em] hidden -rotate-3 text-2xl font-bold transition-opacity duration-300 ease-out [@media(hover:hover)]:block ${seen ? "opacity-0" : "opacity-100"}`}
              >
                hover me ↓
              </p>
              <h1
                aria-label="Draw it. Pin it."
                className="text-[clamp(4rem,15vw,10.5rem)] leading-[0.95] font-black tracking-tighter select-none"
                style={{ cursor: PENCIL_CURSOR }}
                {...handlers}
              >
                <span aria-hidden>{render(on)}</span>
              </h1>
            </div>
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
