"use client";

import { PencilSimpleIcon } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { HEADER_BUTTON, INKED_BUTTON } from "../../b/[slug]/board-look";

type Logo = "bar" | "tab" | "yellow";

/**
 * The logo, round two:
 * - `bar`: a slim white strip across the top with the full-colour wordmark,
 *   the blue hero starting under it. Axis: layout, the logo's own band.
 * - `tab`: a white tab hanging from the top edge, square on top and round
 *   below, like a bookmark. Axis: shape, attached to the page's edge.
 * - `yellow`: the wordmark straight on the blue, yellow with an ink edge,
 *   like "Pin it." Axis: colour, standing out with no shape at all.
 */
function Wordmark({ src, height }: { src: string; height: string }) {
  return (
    <Image
      src={src}
      alt="DrawPin"
      width={463}
      height={152}
      unoptimized
      className={`${height} w-auto`}
    />
  );
}

/** The home page's hero, top part, with one version of the logo. */
export function Hero({ logo }: { logo: Logo }) {
  const tryIt = (
    <a href="#try" className={HEADER_BUTTON}>
      <PencilSimpleIcon weight="bold" className="size-5" />
      Try it
    </a>
  );
  const home = (children: React.ReactNode, className = "") => (
    <Link
      href="/"
      aria-label="DrawPin home"
      className={`focus-visible:ring-highlight outline-none focus-visible:ring-3 ${className}`}
    >
      {children}
    </Link>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      {logo === "bar" && (
        <div className="border-foreground border-b-2 bg-white">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-2.5">
            {home(
              <Wordmark src="/wordmark.webp" height="h-10" />,
              "rounded-lg",
            )}
            <a
              href="#try"
              className="border-foreground hover:bg-secondary inline-flex h-11 items-center gap-2 rounded-xl border-2 bg-white px-4 text-sm font-bold"
            >
              <PencilSimpleIcon weight="bold" className="size-5" />
              Try it
            </a>
          </div>
        </div>
      )}
      <header className="bg-primary text-primary-foreground border-foreground border-b-2">
        {logo === "tab" && (
          <nav className="mx-auto flex w-full max-w-5xl items-start justify-between gap-4 px-5 pb-3">
            {home(
              <span className="border-foreground block rounded-b-2xl border-2 border-t-0 bg-white px-4 pt-3 pb-2.5">
                <Wordmark src="/wordmark.webp" height="h-10" />
              </span>,
            )}
            <span className="pt-4">{tryIt}</span>
          </nav>
        )}
        {logo === "yellow" && (
          <nav className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-5">
            {home(
              <Wordmark src="/wordmark-yellow.webp" height="h-12" />,
              "rounded-lg",
            )}
            {tryIt}
          </nav>
        )}
        <div
          className={`mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 pb-12 ${logo === "bar" ? "pt-8" : "pt-2"}`}
        >
          <h1 className="text-[clamp(4rem,15vw,10.5rem)] leading-[0.86] font-black tracking-tighter">
            Draw it.
            <br />
            <span className="text-winner">Pin it.</span>
          </h1>
          <p className="max-w-md text-lg text-white/85">
            One drawing a day. Everyone votes. One winner a week.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#join" className={INKED_BUTTON}>
              <PencilSimpleIcon weight="bold" className="size-5" />I have a code
            </a>
            <Link href="/login" className={`${HEADER_BUTTON} text-base`}>
              Start a board
            </Link>
          </div>
        </div>
      </header>
    </div>
  );
}
