"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Wordmark } from "../logo/variants";

/** Where something sits: the blue header card, or the white sidebar card. */
export type Surface = "poster" | "sidebar";

/**
 * A logo placement. None of them put the logo in a box of its own: each is
 * a different answer to where the brand lives in the page's structure.
 */
export type Placement = {
  name: string;
  /** A row across the whole page, above the sidebar and the content. */
  bar?: ReactNode;
  /** A narrow column left of everything, the page's spine. */
  spine?: ReactNode;
  /** Positioned on a card itself, overlapping its edge. */
  onFrame?: (surface: Surface) => ReactNode;
  /** Extra top padding inside a card, to clear something on its edge. */
  framePad?: Partial<Record<Surface, string>>;
  /** At the foot of the sidebar card, above its small links. */
  sidebarFoot?: ReactNode;
  /** At the very end of the page. */
  pageFoot?: ReactNode;
  /** The phone's menu button: in the header card's top row, or the variant places it. */
  menu: "frame" | "own";
  /** Space above the header card, for something over its top edge. */
  headerGap?: string;
};

const HOME =
  "focus-visible:ring-highlight rounded-lg outline-none focus-visible:ring-3";

function Home({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href="/" aria-label="DrawPin home" className={`${HOME} ${className}`}>
      {children}
    </Link>
  );
}

/* ---------------------------------------------------------------- 1 */

/**
 * 1. Site header: the logo heads the whole page, on the white, above the
 * sidebar and the content alike, like a website's own header rather than a
 * card's. The phone's menu button sits at the other end of the same row.
 */
export function headerBar(menu: ReactNode): Placement {
  return {
    name: "Header",
    menu: "own",
    bar: (
      <div className="flex items-center justify-between gap-3 px-4 pt-4 md:px-6 lg:px-8 lg:pt-5">
        <Home>
          <Wordmark line priority className="w-40 md:w-44" />
        </Home>
        {menu}
      </div>
    ),
  };
}

/* ---------------------------------------------------------------- 2 */

/**
 * 2. On the edge: the bare logo, no paper, laid across the top edge of the
 * first card on the page, half on the white and half on the card, the way a
 * stamp crosses an envelope's edge. An ink shadow keeps its 3D on the blue.
 */
const straddle: Placement = {
  name: "Edge",
  menu: "frame",
  headerGap: "pt-10 lg:pt-6",
  onFrame: (surface) => (
    <Home
      className={`absolute -top-6 z-20 ${surface === "poster" ? "left-4 lg:hidden" : "left-4"}`}
    >
      <Wordmark ink priority className="w-40" />
    </Home>
  ),
  framePad: { poster: "pt-9 lg:pt-5", sidebar: "pt-14" },
};

/* ---------------------------------------------------------------- 3 */

/**
 * 3. Spine: the logo runs up the left edge of the screen, like the spine of
 * a book or a poster's margin, and stays there as you scroll. The menu
 * button heads the spine on a phone.
 */
export function spine(menu: ReactNode): Placement {
  return {
    name: "Spine",
    menu: "own",
    spine: (
      <div className="sticky top-0 flex h-dvh w-12 shrink-0 flex-col items-center gap-3 py-3 md:w-16 lg:w-20 lg:py-6">
        {menu}
        <div className="relative w-full flex-1">
          <Home className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90">
            <Wordmark
              line
              priority
              className="block w-52 max-w-none md:w-64 lg:w-80"
            />
          </Home>
        </div>
      </div>
    ),
  };
}

/* ---------------------------------------------------------------- 4 */

/**
 * 4. Signed at the end: no logo at the top at all, like an app rather than
 * a website; the page starts with its own content and the menu button. The
 * logo signs off the page instead, big at the end, and the foot of the
 * sidebar, like an artist's signature at the bottom of a poster.
 */
const signOff: Placement = {
  name: "Signature",
  menu: "frame",
  sidebarFoot: (
    <Home className="mx-2 w-fit">
      <Wordmark line className="w-36" />
    </Home>
  ),
  pageFoot: (
    <div className="flex flex-col items-center gap-2 px-5 pt-16 pb-8">
      <Home>
        <Wordmark line className="w-60 md:w-72" />
      </Home>
      <p className="text-muted-foreground text-sm">Draw it. Pin it.</p>
    </div>
  ),
};

export const PLACEMENTS = (menuOnPage: ReactNode, menuOnSpine: ReactNode) => [
  headerBar(menuOnPage),
  straddle,
  spine(menuOnSpine),
  signOff,
];
