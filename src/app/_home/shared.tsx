"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { HEADER_BUTTON, INKED_BUTTON } from "../b/[slug]/board-look";
import type { Tile } from "../b/[slug]/tiles";
import { JoinForm } from "../join/join-form";
import { Story } from "./story";
import { CARD_TITLE } from "./type";

/** An example tile from `public/examples/<file>.webp`. */
function exampleTile(file: string, author: string, caption: string): Tile {
  return {
    id: `example-${file}`,
    author,
    caption,
    isGuest: false,
    isOwn: false,
    imageUrl: `/examples/${file}.webp`,
    createdAt: "",
  };
}

/**
 * The hero's drawings. Each section of the home page has its own set so the
 * same drawing never shows twice (#181): the hero's are here, the week
 * walkthrough's are `WEEK_BOARD`. `malfoida-lisa` (first, with the trophy)
 * is a real drawing from a DrawPin board, used with its maker's name and
 * caption. `skyline` and `dog` are made-up demos from Canva with invented
 * names and captions.
 */
export const HERO_EXAMPLES: Tile[] = [
  exampleTile("malfoida-lisa", "Ricky#7024", "malfoida lisa"),
  exampleTile("skyline", "Ahmad#2041", "golden hour"),
  exampleTile("dog", "Ricky#8983", "Biscuit, 4"),
];

/**
 * The week walkthrough's board, in the order it's drawn, with the votes each
 * tile has in the voting beat. All four are real drawings from DrawPin boards,
 * credited as they were posted. The first is a real weekly winner, so it takes
 * the most votes and the trophy at the end.
 */
export const WEEK_BOARD: { tile: Tile; votes: number }[] = [
  {
    tile: exampleTile("malfoid", "Ricky#7024", "malfoid"),
    votes: 4,
  },
  {
    tile: exampleTile("windy-day", "Ahmad#8620", "? Windy day"),
    votes: 2,
  },
  { tile: exampleTile("lol", "Bennett#9363", "LOL"), votes: 3 },
  { tile: exampleTile("rina", "Kevin#1997", "rina"), votes: 1 },
];

/** The week's winner: the most-voted tile, who gets the trophy. */
export const WEEK_WINNER = WEEK_BOARD[0].tile;

/** The tile posted in the walkthrough's first beat (it's also on the board). */
export const WEEK_POSTED = WEEK_BOARD[3].tile;

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
            It&apos;s the 8-digit code on the board&apos;s card.
          </p>
          <JoinForm />
        </section>
        <section className="bg-primary text-primary-foreground border-foreground flex flex-col items-start justify-between gap-4 rounded-xl border-2 px-5 py-7 shadow-[5px_5px_0_var(--foreground)]">
          <div className="flex flex-col gap-2">
            <h2 className={CARD_TITLE}>Start or manage a board</h2>
            <p className="text-white/85">
              It&apos;s free. Print one QR code and the board runs itself.
              Already have one? Sign in to see your code, reports and settings.
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
