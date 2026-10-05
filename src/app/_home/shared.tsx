"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { INKED_BUTTON, PAPER } from "../b/[slug]/board-look";
import type { Tile } from "../b/[slug]/tiles";
import { JoinForm } from "../join/join-form";
import { CARD_TITLE, OUTLINE_BUTTON, SECTION_TITLE } from "./type";

/**
 * Example drawings (made in Canva, public/examples), each showing a tool
 * people get: the spray can, the pressure pen, shapes and the fill bucket.
 * The names and captions are made up.
 */
export const EXAMPLE: Tile[] = [
  ["skyline", "Maya#2041", "golden hour"],
  ["dog", "Priya#8983", "Biscuit, 4"],
  ["latte", "Theo#1997", "monday fuel"],
  ["lake", "Sam#2683", "weekend plans"],
].map(([file, author, caption]) => ({
  id: `example-${file}`,
  author,
  caption,
  isGuest: false,
  isOwn: false,
  imageUrl: `/examples/${file}.webp`,
  createdAt: "",
}));

/**
 * The home page's top bar (chosen from prototypes on 2026-10-05, "White
 * bar"): a slim white strip above the blue hero, with the wordmark in its
 * own colours on the left, linking home, and on the right the way to try
 * drawing, the one thing the hero's buttons don't already offer. No rule
 * under it: the hero fades in from the white instead of starting on a line.
 */
export function Nav() {
  return (
    <div className="bg-white">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-1.5">
        {/* Cut from the link card (public/og-v2.png), the only copy of the
            wordmark there is. */}
        <Link
          href="/"
          aria-label="DrawPin home"
          className="focus-visible:ring-highlight rounded-lg outline-none focus-visible:ring-3"
        >
          <Image
            src="/wordmark.webp"
            alt="DrawPin"
            width={463}
            height={152}
            unoptimized
            className="h-8 w-auto"
          />
        </Link>
        <a href="#try" className={`${OUTLINE_BUTTON} h-10 px-3 text-sm`}>
          <PencilSimpleIcon weight="bold" className="size-4" />
          Try it
        </a>
      </nav>
    </div>
  );
}

/** The gold trophy, on a drawing's corner. */
export function TrophyBadge({ size }: { size: number }) {
  return (
    <Image
      src="/trophies/gold.webp"
      alt=""
      width={size}
      height={size}
      unoptimized
      className="absolute -right-3 -bottom-3 rotate-6 drop-shadow-[2px_2px_0_rgb(15_27_45/0.25)]"
    />
  );
}

/**
 * The home page's short ending: open a board with a code,
 * start one, and the owner's story word for word.
 */
export function Ending() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-5 py-10">
      <div className="grid gap-6 md:grid-cols-2">
        <section
          id="join"
          className="border-foreground flex scroll-mt-6 flex-col gap-4 rounded-xl border-2 bg-white px-5 py-7 shadow-[5px_5px_0_var(--primary)]"
        >
          <h2 className={CARD_TITLE}>Got a code?</h2>
          <p className="text-muted-foreground -mt-2">
            It&apos;s on the board&apos;s card, and changes every morning.
          </p>
          <JoinForm />
        </section>
        <section className="bg-primary text-primary-foreground border-foreground flex flex-col items-start justify-between gap-4 rounded-xl border-2 px-5 py-7 shadow-[5px_5px_0_var(--foreground)]">
          <div className="flex flex-col gap-2">
            <h2 className={CARD_TITLE}>Start one for your people</h2>
            <p className="text-white/85">
              Free. One QR card on the table and it runs itself.
            </p>
          </div>
          <Link href="/login" className={INKED_BUTTON}>
            Start a board
            <ArrowRightIcon weight="bold" className="size-5" />
          </Link>
        </section>
      </div>

      <section className="flex flex-col gap-5">
        <h2 className={SECTION_TITLE}>Why I made this</h2>
        <div
          className={`text-muted-foreground flex max-w-2xl flex-col gap-3 rounded-xl p-6 text-base leading-relaxed ${PAPER}`}
        >
          <p>
            Whether you&apos;re waiting for your food or sitting with a group of
            friends, there&apos;s a gap — long enough to be bored, too short to
            start anything. Everyone fills it the same way, looking down at a
            phone on their own.
          </p>
          <p>
            DrawPin is an attempt to point that at the room instead. You draw
            one small thing, it goes up next to what everyone else drew today,
            and at the end of the week the room decides which one it liked.
          </p>
          <p>
            That was the idea, anyway. It turns out a room doesn&apos;t have to
            be a café — a classroom, a party, an office, a group chat with
            nothing going on. Nothing to install, nothing to sign up for, and it
            costs nothing to run.
          </p>
        </div>
      </section>
    </main>
  );
}
