"use client";

import { PencilSimpleIcon } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { pinStyle } from "@/components/pin";
import { HEADER_BUTTON, INKED_BUTTON } from "../../b/[slug]/board-look";

type Logo = "cutout" | "white" | "pinned";

/**
 * The logo, one of three ways:
 * - `cutout`: the full-colour wordmark straight on the blue, its 3D edge in
 *   ink so it doesn't vanish into the header. Axis: plain, the mark alone.
 * - `white`: the wordmark's lines only, in white, like a stamp. Axis:
 *   restraint, one colour.
 * - `pinned`: the wordmark on a scrap of paper held up by a pin, tilted,
 *   with no border. Axis: the board's own language.
 */
function Mark({ logo }: { logo: Logo }) {
  if (logo === "pinned") {
    return (
      <span
        className="pinned pin-pop relative block -rotate-3 bg-white px-3 pt-2 pb-1.5 shadow-[0_2px_3px_rgb(15_27_45/0.25),0_8px_16px_rgb(15_27_45/0.2)]"
        style={pinStyle("#ffca39", 150)}
      >
        <Image
          src="/wordmark.webp"
          alt="DrawPin"
          width={463}
          height={152}
          unoptimized
          className="h-9 w-auto"
        />
      </span>
    );
  }
  return (
    <Image
      src={logo === "cutout" ? "/wordmark-cutout.webp" : "/wordmark-white.webp"}
      alt="DrawPin"
      width={463}
      height={152}
      unoptimized
      className="h-11 w-auto"
    />
  );
}

/** The home page's hero, top part, with one version of the logo. */
export function Hero({ logo }: { logo: Logo }) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="bg-primary text-primary-foreground border-foreground border-b-2">
        <nav className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-5">
          <Link
            href="/"
            aria-label="DrawPin home"
            className="focus-visible:ring-highlight rounded-lg outline-none focus-visible:ring-3"
          >
            <Mark logo={logo} />
          </Link>
          <a href="#try" className={HEADER_BUTTON}>
            <PencilSimpleIcon weight="bold" className="size-5" />
            Try it
          </a>
        </nav>
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 pt-2 pb-12">
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
