"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ListIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { useShell } from "@/components/app-shell/shell-frame";
import { TrophyBadge } from "@/components/trophy-badge";
import { HEADER_BUTTON, INKED_BUTTON } from "../../b/[slug]/board-look";
import { PinnedDrawing } from "../../b/[slug]/pinned-drawing";
import { HERO_EXAMPLES, HERO_WINNER } from "../../_home/shared";
import { LogoSticker } from "../logo/sticker";

export type LogoKind = "sticker" | "text" | "wordmark" | "icon" | "pin";
type Tone = "blue" | "white";

/** A small flat push pin, the same drawing as the drawings' pins. */
function PinGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="-2 0 26 30" aria-hidden className={className}>
      <g
        transform="translate(-10 -2) rotate(30 13 31)"
        stroke="#0f1b2d"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="#ffca39"
      >
        <path d="M13 23v8" strokeLinecap="round" />
        <rect x="4" y="19" width="18" height="5" rx="2.5" />
        <path d="M10 19.5v-10h6v10" />
        <rect x="6" y="4" width="14" height="6" rx="3" />
      </g>
    </svg>
  );
}

/** The logo options, each on blue (inside the poster) or on white. */
export function Logo({ kind, tone }: { kind: LogoKind; tone: Tone }) {
  // The picked direction: the owner's logo on pinned white paper.
  if (kind === "sticker") return <LogoSticker size="w-28" />;
  const word =
    tone === "blue" ? (
      <>
        Draw<span className="text-winner">Pin</span>
      </>
    ) : (
      <>
        Draw<span className="text-primary">Pin</span>
      </>
    );
  let body: ReactNode;
  switch (kind) {
    case "wordmark":
      body = (
        <Image
          src="/wordmark.webp"
          alt="DrawPin"
          width={460}
          height={150}
          priority
          className="h-8 w-auto"
        />
      );
      // The image has a white ground, so on blue it's a white sticker.
      if (tone === "blue") {
        body = (
          <span className="border-foreground inline-flex -rotate-2 rounded-lg border-2 bg-white px-1.5 py-0.5 shadow-[3px_3px_0_var(--foreground)]">
            {body}
          </span>
        );
      }
      break;
    case "icon":
      body = (
        <span className="flex items-center gap-2">
          <Image
            src="/logo.webp"
            alt=""
            width={96}
            height={96}
            className={`size-8 rounded-lg ${tone === "blue" ? "ring-2 ring-white/70" : "border-foreground border-2"}`}
          />
          <span className="text-xl font-black tracking-tighter">{word}</span>
        </span>
      );
      break;
    case "pin":
      body = (
        <span className="relative text-xl font-black tracking-tighter">
          {word}
          <PinGlyph className="absolute -top-3 -right-4 size-5 rotate-6" />
        </span>
      );
      break;
    default:
      body = (
        <span className="text-xl font-black tracking-tighter">{word}</span>
      );
  }
  return (
    <Link
      href="/"
      aria-label="DrawPin home"
      className="focus-visible:ring-highlight inline-flex items-center rounded-lg px-1 outline-none focus-visible:ring-3"
    >
      {body}
    </Link>
  );
}

const OPEN = "Open menu";

/** Menu button in the poster's own style (translucent white on blue). */
export function BlueMenuButton() {
  const { setDrawerOpen } = useShell();
  return (
    <button
      type="button"
      aria-label={OPEN}
      onClick={() => setDrawerOpen(true)}
      className="focus-visible:ring-highlight inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/35 outline-none hover:bg-white/25 focus-visible:ring-3 lg:hidden"
    >
      <ListIcon weight="bold" className="size-6" />
    </button>
  );
}

/** White inked menu button, for a white bar. */
export function WhiteMenuButton() {
  const { setDrawerOpen } = useShell();
  return (
    <button
      type="button"
      aria-label={OPEN}
      onClick={() => setDrawerOpen(true)}
      className="border-foreground hover:bg-secondary focus-visible:ring-highlight inline-flex size-11 shrink-0 items-center justify-center rounded-xl border-2 bg-white outline-none focus-visible:ring-3 lg:hidden"
    >
      <ListIcon weight="bold" className="size-6" />
    </button>
  );
}

/** A round yellow button stuck on the poster's corner like a pin's head. */
export function CornerMenuButton() {
  const { setDrawerOpen } = useShell();
  return (
    <button
      type="button"
      aria-label={OPEN}
      onClick={() => setDrawerOpen(true)}
      className="border-foreground bg-winner focus-visible:ring-highlight absolute top-3 right-3 z-20 inline-flex size-12 items-center justify-center rounded-full border-2 text-[#0f1b2d] shadow-[3px_3px_0_var(--foreground)] outline-none focus-visible:ring-3 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none lg:hidden"
    >
      <ListIcon weight="bold" className="size-6" />
    </button>
  );
}

/** A "Menu" pill floating at the bottom left, where a thumb rests. */
export function FloatingMenuButton() {
  const { setDrawerOpen } = useShell();
  return (
    <button
      type="button"
      onClick={() => setDrawerOpen(true)}
      className="border-foreground focus-visible:ring-highlight fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 z-30 inline-flex min-h-12 items-center gap-2 rounded-full border-2 bg-white px-4 font-bold shadow-[4px_4px_0_var(--primary)] outline-none focus-visible:ring-3 lg:hidden"
    >
      <ListIcon weight="bold" className="size-5" />
      Menu
    </button>
  );
}

/**
 * A copy of the home page's poster with three slots: `top`, a row inside the
 * poster above the headline; `corner`, something positioned on it; and
 * `sticker`, the logo sticker pinned over its top edge on a phone (outside
 * the poster, which clips).
 */
export function ProtoPoster({
  top,
  corner,
  sticker,
}: {
  top?: ReactNode;
  corner?: ReactNode;
  sticker?: ReactNode;
}) {
  const SPOTS = [
    "md:absolute md:top-10 md:right-[4%] md:w-40 md:rotate-2",
    "md:absolute md:top-[44%] md:right-[22%] md:w-40 md:-rotate-1",
    "md:absolute md:bottom-6 md:right-[3%] md:w-40 md:rotate-1",
  ];
  // With a sticker and no top row, the headline starts below the part of
  // the sticker that's on the poster.
  const pad = top ? "pt-4" : sticker ? "pt-12 lg:pt-8" : "pt-8";
  return (
    <div
      className={`relative mx-auto w-full max-w-7xl px-3 md:px-6 ${sticker ? "pt-9 lg:pt-6" : "pt-3 md:pt-6"}`}
    >
      {sticker && (
        <div className="absolute top-3 left-7 z-20 md:left-10 lg:hidden">
          {sticker}
        </div>
      )}
      <header className="bg-primary text-primary-foreground border-foreground relative overflow-hidden rounded-2xl border-2 shadow-[6px_6px_0_var(--foreground)]">
        {corner}
        <div
          className={`relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 pb-10 md:min-h-[28rem] md:justify-center ${pad}`}
        >
          {top}
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
              <PencilSimpleIcon weight="bold" className="size-5" />I have a code
            </a>
            <Link href="/setup" className={`${HEADER_BUTTON} text-base`}>
              Start a board
            </Link>
          </div>
          <ul className="grid grid-cols-3 gap-3 pt-6 md:contents">
            {HERO_EXAMPLES.map((tile, index) => (
              <li key={tile.id} className={`min-w-0 ${SPOTS[index]}`}>
                <PinnedDrawing
                  tile={tile}
                  index={index}
                  badge={
                    tile === HERO_WINNER ? <TrophyBadge size={40} /> : undefined
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      </header>
    </div>
  );
}
