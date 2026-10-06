"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { INKED_BUTTON, PAPER } from "../b/[slug]/board-look";
import type { Tile } from "../b/[slug]/tiles";
import { JoinForm } from "../join/join-form";
import { CARD_TITLE, SECTION_TITLE } from "./type";

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
 * The home page's short ending: open a board with a code,
 * start one, and the owner's story word for word.
 */
export function Ending() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 py-10">
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
            I love it when software makes a difference in people&apos;s everyday
            lives. There seems to be a gap between software that makes work
            better and software that gives everyone something fun to do every
            day.
          </p>
          <p>
            DrawPin is my attempt to point what I know about building software
            in that direction. Draw a tile every day with your friend group, at
            work or at your favorite local spot. It goes up next to everyone
            else&apos;s, and at the end of the week the competition begins. That
            was the idea, anyway.
          </p>
          <p>
            It turned out there was a lot for me to learn as an aspiring
            software engineer, too. I wanted this one idea to cover every part
            of building software I felt unsure about: UI/UX design, security and
            bot protection, computer vision and content moderation, database
            design, sign-in, live updates, automated testing, Docker, continuous
            integration and deployment, and much more. It became a chance to
            bring groups of people a good time, and to give myself a better
            learning experience than I ever expected.
          </p>
          <p>So have fun, and get drawing :)</p>
        </div>
      </section>
    </main>
  );
}
