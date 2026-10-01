/**
 * Sample board for the vibe prototypes: real drawings from the preview
 * board's storage, with the made-up names the preview seed uses. Nothing here
 * touches a database. Delete this folder once a direction is picked.
 */
const STORAGE =
  "https://aavthunnnxytwxfemygi.supabase.co/storage/v1/object/public/tiles/bf8c1aa7-ef5d-45c1-8614-8f15b4339c7c";

const THIS_WEEK = "c72e3d9c-5c8b-49e8-9464-255b140a3d1b";
const LAST_WEEK = "962a874a-8bc5-492d-bae0-9ef0fd2437a5";
const OLDER_WEEK = "258dbd1c-faa0-4d9b-886b-e877a5fb6a89";

export type ProtoTile = {
  id: string;
  author: string;
  caption: string | null;
  src: string;
  isNew?: boolean;
};

const tile = (
  week: string,
  file: string,
  author: string,
  caption: string | null,
  isNew = false,
): ProtoTile => ({
  id: file,
  author,
  caption,
  src: `${STORAGE}/${week}/${file}.webp`,
  isNew,
});

export const BOARD = {
  name: "Maple Street Café",
  artists: 9,
  drawings: 15,
  thisWeek: 8,
  votesLeft: 3,
  closesOn: "Monday",
  peekTotal: 7,
  viewer: "Maya Okafor#4376",
};

export const TILES: ProtoTile[] = [
  tile(
    THIS_WEEK,
    "1d07fd34-5373-4f86-832b-b53471c37590",
    "Lucía Ferreira#9928",
    null,
    true,
  ),
  tile(
    THIS_WEEK,
    "a15f972b-e47a-4ea5-baf4-5e91ca186aaf",
    "Jonah Whitfield#5366",
    "don't ask",
  ),
  tile(
    THIS_WEEK,
    "3afed850-5b28-4afb-b777-069f022da99a",
    "Priya Raman#8983",
    "my cat, probably",
  ),
  tile(
    THIS_WEEK,
    "504a667d-6260-4c4b-bd61-58d88738d154",
    "Theo Lindqvist#1997",
    null,
  ),
  tile(
    THIS_WEEK,
    "3e87ac9a-0161-4968-9441-46e3ab3cef5f",
    "Maya Okafor#4376",
    "first try",
  ),
  tile(
    OLDER_WEEK,
    "8eb38ce9-0cbe-468f-893b-765dfa77e856",
    "Eli Brennan#3361",
    "10 minutes, no undo",
  ),
  tile(
    OLDER_WEEK,
    "095b119a-2984-44c1-a40b-7a2057dfbde2",
    "Noor Haddad#5573",
    "he's friendly",
  ),
  tile(
    OLDER_WEEK,
    "73235a05-cf7b-4b33-8792-b43259707fee",
    "Sam Kowalczyk#2683",
    "drawn on the bus",
  ),
];

export const PEEK: string[] = [
  `${STORAGE}/${LAST_WEEK}/3a0cc83f-9539-422e-88c9-8c3d0fb6c190.webp`,
  `${STORAGE}/${LAST_WEEK}/68c7090a-2c5f-45ad-95a9-cae5757f3a5e.webp`,
  `${STORAGE}/${LAST_WEEK}/6f3c57ca-bc0b-4cfe-bd9d-06b1afb76832.webp`,
  `${STORAGE}/${LAST_WEEK}/17bc9e47-dfd3-4e42-b7d8-e4952927511f.webp`,
  `${STORAGE}/${LAST_WEEK}/fb452241-3f3e-4868-a774-408daed98a29.webp`,
];

/** A small, steady lean per tile, so a re-render doesn't reshuffle them. */
export function leanFor(index: number, range = 1.4): number {
  const pattern = [-1, 0.7, 0.4, -0.6, 1, -0.3, 0.8, -0.9];
  return pattern[index % pattern.length] * range;
}
