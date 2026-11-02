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
 * walkthrough's are `WEEK_BOARD`. All three are real drawings from a DrawPin
 * board, credited with their maker's name and caption as they were posted.
 * `malfoid` was a real weekly winner, so it wears the trophy (`HERO_WINNER`).
 */
export const HERO_EXAMPLES: Tile[] = [
  exampleTile("windy-day", "Ahmad Hijazi#8620", "? Windy day"),
  exampleTile("malfoid", "Ricky Liang#7024", "malfoid"),
  exampleTile("rina", "Mirina#1363", "rina"),
];

/** The hero drawing that wears the trophy. */
export const HERO_WINNER = HERO_EXAMPLES[1];

/**
 * The week walkthrough's board, in the order it's drawn, with the votes each
 * tile has in the voting beat. All four are real drawings from a DrawPin
 * board, credited as they were posted. The first takes the most votes and the
 * trophy at the end.
 */
export const WEEK_BOARD: { tile: Tile; votes: number }[] = [
  {
    tile: exampleTile("malfoida-lisa", "Ricky Liang#7024", "malfoida lisa"),
    votes: 4,
  },
  { tile: exampleTile("mr-hijazi", "Kevin A.#7495", "mr hijazi"), votes: 2 },
  { tile: exampleTile("lol", "Bennett Marceaux#9363", "LOL"), votes: 3 },
  { tile: exampleTile("no-tung", "Fitz#2944", "No tung?"), votes: 1 },
];

/** The week's winner: the most-voted tile, who gets the trophy. */
export const WEEK_WINNER = WEEK_BOARD[0].tile;

/** The tile posted in the walkthrough's first beat (it's also on the board). */
export const WEEK_POSTED = WEEK_BOARD[2].tile;

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
          {/* Signed out, both ask to sign in first. Signed in, Start a board
              is setup, which also starts a second board (ADR-016), and
              /admin goes to the owner's board, or their list of boards. */}
          <div className="flex flex-wrap gap-3">
            <Link href="/setup" className={INKED_BUTTON}>
              Start a board
              <ArrowRightIcon weight="bold" className="size-5" />
            </Link>
            <Link href="/admin" className={`${HEADER_BUTTON} text-base`}>
              Manage my board
            </Link>
          </div>
        </section>
      </div>

      <Story />
    </main>
  );
}
