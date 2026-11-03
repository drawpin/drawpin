"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { pinStyle } from "@/components/pin";

/**
 * The owner's logo, cut out of its white ground (public/brand/, from the
 * 2250px original): `wordmark.webp` without the pen's line, and
 * `wordmark-line.webp` with it. Both are 964px wide and share their top, so
 * the line version stacks exactly under the plain one.
 */
const PLAIN = { src: "/brand/wordmark.webp", width: 964, height: 291 };
const LINED = { src: "/brand/wordmark-line.webp", width: 964, height: 333 };

/**
 * The logo. `line` adds the pen's line, drawn in from left to right on load
 * (the pen writing it); `ink` gives it an ink shadow, which brings back its
 * 3D on the blue poster, where its own blue depth disappears.
 */
export function Wordmark({
  className,
  line = false,
  ink = false,
  priority = false,
}: {
  /** Sets the size, by width (`w-40`) or height. */
  className: string;
  line?: boolean;
  ink?: boolean;
  priority?: boolean;
}) {
  const shadow = ink ? "[filter:drop-shadow(3px_3px_0_#0f1b2d)]" : "";
  if (!line) {
    return (
      <Image
        {...PLAIN}
        alt="DrawPin"
        priority={priority}
        className={`h-auto ${shadow} ${className}`}
      />
    );
  }
  return (
    <span className={`relative inline-block ${shadow} ${className}`}>
      <Image
        {...LINED}
        alt=""
        aria-hidden
        priority={priority}
        className="logo-line block h-auto w-full"
      />
      <Image
        {...PLAIN}
        alt="DrawPin"
        priority={priority}
        className="absolute inset-x-0 top-0 h-auto w-full"
      />
    </span>
  );
}

/** Where a treatment sits: the blue poster, or the white sidebar card. */
export type Surface = "poster" | "sidebar";

export type LogoVariant = {
  name: string;
  /** Replaces the poster's headline block (the h1), when it changes. */
  headline?: ReactNode;
  /** On the page, above the frame. */
  above?: (surface: Surface) => ReactNode;
  /** Inside the frame, before its content. */
  inside?: (surface: Surface) => ReactNode;
  /** Positioned on the frame itself, overlapping its edge. */
  onFrame?: (surface: Surface) => ReactNode;
  /** Wraps the frame, for a variant that changes the frame's shape. */
  frame?: (surface: Surface, card: ReactNode) => ReactNode;
  /** Extra top padding inside the frame, to clear something on its edge. */
  framePad?: Partial<Record<Surface, string>>;
  /** The phone's menu button: in the poster's top row, or beside `above`. */
  menu: "poster" | "page";
  /** The frame draws its own offset shadow (the tab's single silhouette). */
  ownShadow?: boolean;
};

const HOME =
  "focus-visible:ring-highlight rounded-lg outline-none focus-visible:ring-3";

/* ---------------------------------------------------------------- 1 */

/**
 * 1. Masthead: the logo on the white page, where it was designed, at a size
 * that owns the top of the page, with the pen drawing its line on load. The
 * poster starts under it. On a laptop it heads the sidebar column the same
 * way, above the card rather than in it.
 */
const masthead: LogoVariant = {
  name: "Masthead",
  menu: "page",
  above: (surface) =>
    surface === "poster" ? (
      <Link href="/" aria-label="DrawPin home" className={`${HOME} lg:hidden`}>
        <Wordmark line priority className="w-48" />
      </Link>
    ) : (
      <Link href="/" aria-label="DrawPin home" className={`${HOME} mb-4 ml-2`}>
        <Wordmark line priority className="w-52" />
      </Link>
    ),
};

/* ---------------------------------------------------------------- 2 */

/**
 * 2. Hero: the logo is the headline. It leads the poster big, with an ink
 * shadow so its 3D reads on the blue, and "Draw it. Pin it." becomes the
 * line under it. On a laptop the sidebar keeps a small one at its top.
 */
const hero: LogoVariant = {
  name: "Hero",
  menu: "poster",
  headline: (
    <>
      <span className="sr-only">DrawPin: </span>
      <Wordmark
        line
        ink
        priority
        className="block w-[min(100%,22rem)] md:w-[30rem]"
      />
      <span className="mt-5 block text-[clamp(2.5rem,9vw,4.5rem)] leading-[0.9]">
        Draw it. <span className="text-winner">Pin it.</span>
      </span>
    </>
  ),
  inside: (surface) =>
    surface === "sidebar" ? (
      <Link href="/" aria-label="DrawPin home" className={`${HOME} ml-2 w-fit`}>
        <Wordmark priority className="w-40" />
      </Link>
    ) : null,
};

/* ---------------------------------------------------------------- 3 */

/** The logo on a white sticker, pinned over the frame's top edge. */
function Sticker({ surface }: { surface: Surface }) {
  return (
    <Link
      href="/"
      aria-label="DrawPin home"
      className={`absolute -top-6 z-20 ${surface === "poster" ? "left-4 lg:hidden" : "left-5"} ${HOME}`}
    >
      <span
        style={pinStyle("#ffca39", 150)}
        className="pinned pin-pop border-foreground relative block -rotate-2 rounded-md border-2 bg-white px-2.5 pt-2.5 pb-1.5 shadow-[3px_3px_0_var(--foreground)]"
      >
        <Wordmark priority className="w-36" />
      </span>
    </Link>
  );
}

/**
 * 3. Sticker: the logo on its own white paper (so its 3D shows as designed),
 * pinned over the top edge of the poster, and of the sidebar on a laptop,
 * like the drawings.
 */
const sticker: LogoVariant = {
  name: "Sticker",
  menu: "poster",
  onFrame: (surface) => <Sticker surface={surface} />,
  framePad: { sidebar: "pt-16" },
};

/* ---------------------------------------------------------------- 4 */

/**
 * 4. Tab: a white tab grows out of the frame's top edge with the logo in it,
 * one silhouette with one shadow. White, so the logo sits on the ground it
 * was made for.
 */
const tab: LogoVariant = {
  name: "Tab",
  menu: "poster",
  ownShadow: true,
  frame: (surface, card) => {
    const poster = surface === "poster";
    return (
      <div
        className={
          poster
            ? "[filter:drop-shadow(6px_6px_0_var(--foreground))]"
            : "flex flex-1 flex-col [filter:drop-shadow(6px_6px_0_var(--primary))]"
        }
      >
        <Link
          href="/"
          aria-label="DrawPin home"
          className={`border-foreground relative z-10 -mb-[2px] ml-4 w-fit rounded-t-xl border-2 border-b-0 bg-white px-3 pt-2 pb-[6px] outline-none focus-visible:underline ${poster ? "flex lg:hidden" : "flex"}`}
        >
          <Wordmark priority className="w-32" />
        </Link>
        {card}
      </div>
    );
  },
};

export const VARIANTS: LogoVariant[] = [masthead, hero, sticker, tab];
