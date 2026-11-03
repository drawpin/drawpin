"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { pinStyle } from "@/components/pin";

/** A flat push pin, drawn like the drawings' pins, standing upright-ish. */
export function PinGlyph({
  className = "",
  fill = "#ffca39",
}: {
  className?: string;
  fill?: string;
}) {
  return (
    <svg viewBox="-2 0 26 30" aria-hidden className={className}>
      <g
        transform="translate(-10 -2) rotate(30 13 31)"
        stroke="#0f1b2d"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill={fill}
      >
        <path d="M13 23v8" strokeLinecap="round" />
        <rect x="4" y="19" width="18" height="5" rx="2.5" />
        <path d="M10 19.5v-10h6v10" />
        <rect x="6" y="4" width="14" height="6" rx="3" />
        <path
          d="M11.8 11.5v5.5"
          stroke="white"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeOpacity="0.8"
        />
      </g>
    </svg>
  );
}

/** Where a brand treatment sits: on the blue poster or the white sidebar. */
export type Surface = "poster" | "sidebar";

export type LogoVariant = {
  name: string;
  /** The poster's headline, when the variant changes it. */
  headline?: ReactNode;
  /** Drawn inside the poster's (or sidebar card's) frame, before content. */
  inside?: (surface: Surface) => ReactNode;
  /** Positioned on the frame itself (overlapping its edge). */
  onFrame?: (surface: Surface) => ReactNode;
  /** Wraps the frame, for variants that change the frame's shape. */
  frame?: (surface: Surface, card: ReactNode) => ReactNode;
  /** Extra top padding inside the frame, to clear something on its edge. */
  framePad?: Partial<Record<Surface, string>>;
  /** Which side of the poster's top the phone's menu button takes. */
  menuSide: "left" | "right";
  /** Whether the frame draws its own offset shadow. */
  ownShadow?: boolean;
};

const HOME =
  "focus-visible:ring-highlight rounded-lg outline-none focus-visible:ring-3";

/* ---------------------------------------------------------------- 1 */

/** "Pin it" with a push pin for its full stop, stuck into the line. */
function PinStop({ size }: { size: string }) {
  return (
    <span className="relative inline-block w-[0.42em] align-baseline">
      <PinGlyph
        className={`absolute bottom-[-0.02em] left-[-0.06em] ${size}`}
      />
    </span>
  );
}

/**
 * 1. Headline: the slogan is the logo. No name tag anywhere: "Draw it. Pin
 * it." with a real pin for the last full stop, big on the poster and small
 * at the top of the sidebar.
 */
const headline: LogoVariant = {
  name: "Headline",
  menuSide: "right",
  headline: (
    <>
      Draw it.
      <br />
      <span className="text-winner">
        Pin it
        <PinStop size="h-[0.55em] w-[0.5em]" />
      </span>
    </>
  ),
  inside: (surface) =>
    surface === "sidebar" ? (
      <Link href="/" aria-label="DrawPin home" className={`${HOME} w-fit pl-2`}>
        <span className="block text-[1.7rem] leading-[0.9] font-black tracking-tighter">
          Draw it.
          <br />
          <span className="text-primary">
            Pin it
            <PinStop size="h-[0.6em] w-[0.55em]" />
          </span>
        </span>
      </Link>
    ) : null,
};

/* ---------------------------------------------------------------- 2 */

/** The name on a scrap of paper, pinned over the frame's top edge. */
function PinnedTag({ surface }: { surface: Surface }) {
  return (
    <Link
      href="/"
      aria-label="DrawPin home"
      className={`absolute z-20 ${surface === "poster" ? "-top-5 left-5 lg:hidden" : "-top-5 left-6"} ${HOME}`}
    >
      <span
        style={pinStyle("#ffca39", 150)}
        className="pinned pin-pop border-foreground relative block -rotate-3 border-2 bg-white px-3 pt-2 pb-1.5 text-2xl leading-none font-black tracking-tighter text-[#0f1b2d] shadow-[3px_3px_0_var(--foreground)]"
      >
        Draw<span className="text-primary">Pin</span>
      </span>
    </Link>
  );
}

/**
 * 2. Pinned tag: the name is a thing on the wall, like the drawings. A white
 * paper tag pinned over the top edge of the poster, and of the sidebar on a
 * laptop, half on and half off.
 */
const tag: LogoVariant = {
  name: "Pinned tag",
  menuSide: "right",
  onFrame: (surface) => <PinnedTag surface={surface} />,
  framePad: { sidebar: "pt-10" },
};

/* ---------------------------------------------------------------- 3 */

/**
 * 3. Tab: the name is part of the frame's shape. The poster (and the sidebar
 * card) grows a folder tab from its top edge, same fill and ink line, one
 * silhouette with one shadow.
 */
const tab: LogoVariant = {
  name: "Tab",
  menuSide: "right",
  ownShadow: true,
  frame: (surface, card) => {
    const blue = surface === "poster";
    return (
      <div
        className={
          blue
            ? "[filter:drop-shadow(6px_6px_0_var(--foreground))]"
            : "flex flex-1 flex-col [filter:drop-shadow(6px_6px_0_var(--primary))]"
        }
      >
        <Link
          href="/"
          aria-label="DrawPin home"
          className={`border-foreground relative z-10 -mb-[2px] ml-4 w-fit ${blue ? "inline-flex lg:hidden" : "inline-flex"} rounded-t-xl border-2 border-b-0 px-4 pt-1.5 pb-[6px] text-xl leading-none font-black tracking-tighter outline-none focus-visible:underline ${blue ? "bg-primary text-white" : "bg-white text-[#0f1b2d]"}`}
        >
          Draw<span className={blue ? "text-winner" : "text-primary"}>Pin</span>
        </Link>
        {card}
      </div>
    );
  },
};

/* ---------------------------------------------------------------- 4 */

/** A round rubber stamp: the name around the rim, a pin in the middle. */
function Stamp({ size }: { size: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label="DrawPin"
      className="logo-stamp -rotate-12"
    >
      <defs>
        <path id="rim" d="M50 50 m-35 0 a35 35 0 1 1 70 0 a35 35 0 1 1 -70 0" />
      </defs>
      <circle
        cx="50"
        cy="50"
        r="47"
        fill="#ffca39"
        stroke="#0f1b2d"
        strokeWidth="3"
      />
      <circle
        cx="50"
        cy="50"
        r="25"
        fill="white"
        stroke="#0f1b2d"
        strokeWidth="2.5"
      />
      <text
        fill="#0f1b2d"
        fontSize="12.5"
        fontWeight="900"
        letterSpacing="1.2"
        style={{ fontFamily: "var(--font-geist-sans)" }}
      >
        <textPath href="#rim">DRAWPIN · DRAW IT · PIN IT ·</textPath>
      </text>
      <g transform="translate(36 33) scale(1.05)">
        <g
          transform="translate(-10 -2) rotate(30 13 31)"
          stroke="#0f1b2d"
          strokeWidth="1.6"
          strokeLinejoin="round"
          fill="#004aad"
        >
          <path d="M13 23v8" strokeLinecap="round" />
          <rect x="4" y="19" width="18" height="5" rx="2.5" />
          <path d="M10 19.5v-10h6v10" />
          <rect x="6" y="4" width="14" height="6" rx="3" />
        </g>
      </g>
    </svg>
  );
}

/**
 * 4. Stamp: the name is an emblem pressed onto the corner of the frame, a
 * yellow rubber stamp with the name around the rim and a pin in the middle.
 */
const stamp: LogoVariant = {
  name: "Stamp",
  menuSide: "left",
  onFrame: (surface) => (
    <Link
      href="/"
      aria-label="DrawPin home"
      className={`absolute z-20 rounded-full ${surface === "poster" ? "-top-4 -right-2 lg:hidden" : "-top-5 -left-4"} ${HOME}`}
    >
      <Stamp size={surface === "poster" ? 92 : 84} />
    </Link>
  ),
  framePad: { sidebar: "pt-16" },
};

export const VARIANTS: LogoVariant[] = [headline, tag, tab, stamp];
