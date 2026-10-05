"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, PushPinIcon } from "@phosphor-icons/react";
import {
  HEADER_BUTTON,
  INKED_BUTTON,
  PAPER,
  YELLOW_STRIP,
} from "../../b/[slug]/board-look";
import type { Tile } from "../../b/[slug]/tiles";
import { JoinForm } from "../../join/join-form";

/** Example drawings (Canva doodles, public/examples), made-up names. */
export const EXAMPLE: Tile[] = [
  ["cat", "Maya#2041", "party cat"],
  ["rocket", "Priya#8983", "to the moon"],
  ["burger", "Theo#1997", "lunch, probably"],
  ["flower", "Sam#2683", null],
].map(([file, author, caption]) => ({
  id: `example-${file}`,
  author,
  caption,
  isGuest: false,
  isOwn: false,
  imageUrl: `/examples/${file}.webp`,
  createdAt: "",
}));

/** The site's top bar, on whatever the hero's background is. */
export function Nav({ tone = "blue" }: { tone?: "blue" | "tint" }) {
  return (
    <nav className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-5">
      <span
        className={`flex items-center gap-1.5 text-lg font-black tracking-tight ${tone === "blue" ? "text-white" : "text-foreground"}`}
      >
        <PushPinIcon weight="fill" className="text-winner size-5" />
        DrawPin
      </span>
      <Link
        href="/login"
        className={
          tone === "blue"
            ? `${HEADER_BUTTON} h-10 text-white`
            : `border-foreground hover:bg-secondary inline-flex h-10 items-center rounded-xl border-2 bg-white px-4 text-sm font-bold`
        }
      >
        Start a board
      </Link>
    </nav>
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
 * The same short ending under every direction: open a board with a code,
 * start one, and the owner's story word for word.
 */
export function Ending() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-5 py-16">
      <div className="grid gap-6 md:grid-cols-2">
        <section
          id="join"
          className="border-foreground flex scroll-mt-6 flex-col gap-4 rounded-xl border-2 bg-white px-5 py-7 shadow-[5px_5px_0_var(--primary)]"
        >
          <h2 className="text-2xl font-black tracking-tight">Got a code?</h2>
          <p className="text-muted-foreground -mt-2 text-sm">
            It&apos;s on the board&apos;s card, and changes every morning.
          </p>
          <JoinForm />
        </section>
        <section className="bg-primary text-primary-foreground border-foreground flex flex-col items-start justify-between gap-4 rounded-xl border-2 px-5 py-7 shadow-[5px_5px_0_var(--foreground)]">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-black tracking-tight">
              Start one for your people
            </h2>
            <p className="text-sm text-white/85">
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
        <h2 className={`${YELLOW_STRIP} text-3xl`}>Why I made this</h2>
        <div
          className={`text-muted-foreground flex max-w-2xl flex-col gap-3 rounded-lg p-6 text-[15px] leading-relaxed ${PAPER}`}
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
