"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { HEADER_BUTTON, INKED_BUTTON } from "../b/[slug]/board-look";
import type { Tile } from "../b/[slug]/tiles";
import { JoinForm } from "../join/join-form";
import { Story } from "./story";
import { CARD_TITLE } from "./type";

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
 * The home page's short ending: open a board with a code, start a board or
 * manage one, and the owner's story (`Story`).
 */
export function Ending() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 py-10">
      <div className="grid gap-6 md:grid-cols-2">
        <section
          id="join"
          className="border-foreground flex scroll-mt-6 flex-col gap-4 rounded-xl border-2 bg-white px-5 py-7 shadow-[5px_5px_0_var(--primary)]"
        >
          <h2 className={CARD_TITLE}>Have a code?</h2>
          <p className="text-muted-foreground -mt-2">
            It&apos;s on the board&apos;s card, and changes every morning.
          </p>
          <JoinForm />
        </section>
        <section className="bg-primary text-primary-foreground border-foreground flex flex-col items-start justify-between gap-4 rounded-xl border-2 px-5 py-7 shadow-[5px_5px_0_var(--foreground)]">
          <div className="flex flex-col gap-2">
            <h2 className={CARD_TITLE}>Start or manage a board</h2>
            <p className="text-white/85">
              It&apos;s free. Print one QR code and the board runs itself.
              Already have one? Sign in to see today&apos;s code, reports and
              settings.
            </p>
          </div>
          {/* Both go to the same email sign-in: it takes a new owner on to
              set a board up, and an owner who has one straight to it. */}
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className={INKED_BUTTON}>
              Start a board
              <ArrowRightIcon weight="bold" className="size-5" />
            </Link>
            <Link href="/login" className={`${HEADER_BUTTON} text-base`}>
              Manage my board
            </Link>
          </div>
        </section>
      </div>

      <Story />
    </main>
  );
}
