"use client";

import { BoardLayout } from "../../b/[slug]/board-look";
import type { Tile } from "../../b/[slug]/tiles";
import { dense, loose, makeFill, quick } from "./fills";
import { Podium } from "./podium";

/** The preview board's real drawings from last week (public storage). */
const STORAGE =
  "https://aavthunnnxytwxfemygi.supabase.co/storage/v1/object/public/tiles/bf8c1aa7-ef5d-45c1-8614-8f15b4339c7c/962a874a-8bc5-492d-bae0-9ef0fd2437a5";

const tile = (id: string, file: string, author: string): Tile => ({
  id,
  author,
  caption: null,
  isGuest: false,
  isOwn: false,
  imageUrl: `${STORAGE}/${file}.webp`,
  createdAt: "2026-09-22T17:00:00Z",
});

const LEADERS = [
  {
    place: 1 as const,
    votes: 4,
    tile: tile(
      "00000000-0000-4000-8000-000000000001",
      "fb452241-3f3e-4868-a774-408daed98a29",
      "Jonah Whitfield#8504",
    ),
  },
  {
    place: 2 as const,
    votes: 3,
    tile: tile(
      "00000000-0000-4000-8000-000000000002",
      "68c7090a-2c5f-45ad-95a9-cae5757f3a5e",
      "Noor Haddad#5573",
    ),
  },
  {
    place: 3 as const,
    votes: 2,
    tile: tile(
      "00000000-0000-4000-8000-000000000003",
      "6f3c57ca-bc0b-4cfe-bd9d-06b1afb76832",
      "Sam Kowalczyk#7060",
    ),
  },
];

const FILLS = {
  quick: makeFill(quick),
  loose: makeFill(loose),
  dense: makeFill(dense),
};

/** The vote page's top, with one version of the podium's fill. */
export function Variant({ fill }: { fill: keyof typeof FILLS }) {
  return (
    <BoardLayout
      header={
        <h1 className="text-4xl leading-[1.02] font-black tracking-tight">
          Vote for last week&apos;s best
        </h1>
      }
    >
      <Podium leaders={LEADERS} Fill={FILLS[fill]} />
    </BoardLayout>
  );
}
