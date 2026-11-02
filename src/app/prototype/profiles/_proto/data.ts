/**
 * PROTOTYPE ONLY (profiles design step, 2026-11-02). Hard-coded fake data for
 * the screens under /prototype/profiles. Deleted before feat/profiles merges
 * to main; nothing outside src/app/prototype may import it.
 */

/** Where a board is in its week, as far as the person looking is concerned. */
export type BoardStatus = "draw" | "vote" | "final" | "results" | null;

export type ProtoBoard = {
  slug: string;
  name: string;
  /** The status dot on the board's row: what's waiting for you there. */
  status: BoardStatus;
  /** How many votes you have left, when `status` is "vote". */
  votesLeft?: number;
  pinned: boolean;
  /** You run this board. */
  owned: boolean;
  /** The board's latest drawings, newest first. */
  latest: string[];
  /** e.g. "Today", "Yesterday", "3 days ago". */
  lastVisit: string;
  drawingsThisWeek: number;
};

const img = (file: string) => `/examples/${file}.webp`;

export const BOARDS: ProtoBoard[] = [
  {
    slug: "office-doodles",
    name: "Office Doodles",
    status: "draw",
    pinned: true,
    owned: true,
    latest: [img("windy-day"), img("lol"), img("no-tung")],
    lastVisit: "Today",
    drawingsThisWeek: 14,
  },
  {
    slug: "friends-board",
    name: "Friends Board",
    status: "vote",
    votesLeft: 3,
    pinned: true,
    owned: false,
    latest: [img("malfoid"), img("rina"), img("mr-hijazi")],
    lastVisit: "Yesterday",
    drawingsThisWeek: 9,
  },
  {
    slug: "room-12-art",
    name: "Room 12 Art Club",
    status: "final",
    pinned: false,
    owned: false,
    latest: [img("malfoida-lisa"), img("windy-day"), img("lol")],
    lastVisit: "2 days ago",
    drawingsThisWeek: 22,
  },
  {
    slug: "book-club",
    name: "Book Club",
    status: "results",
    pinned: false,
    owned: true,
    latest: [img("no-tung"), img("rina"), img("malfoid")],
    lastVisit: "4 days ago",
    drawingsThisWeek: 5,
  },
  {
    slug: "family-chat",
    name: "Family Chat",
    status: null,
    pinned: false,
    owned: false,
    latest: [img("mr-hijazi"), img("malfoida-lisa"), img("windy-day")],
    lastVisit: "Last week",
    drawingsThisWeek: 3,
  },
];

/** The recent boards a signed-out device remembers. */
export const DEVICE_BOARDS: ProtoBoard[] = [BOARDS[1], BOARDS[2]].map(
  (board) => ({ ...board, pinned: false, owned: false, status: null }),
);

/** The boards a member who runs nothing sees. */
export const MEMBER_BOARDS: ProtoBoard[] = BOARDS.filter(
  (board) => !board.owned,
).map((board, index) => ({ ...board, pinned: index === 0 }));

export const ME = {
  name: "Ahmad",
  tag: "8620",
  initial: "A",
  joined: "March 2026",
  stats: { drawings: 47, weeklyWins: 3, superWins: 1, boards: 5 },
};

/** The most boards one account can run (PLAN v20: a server-side constant). */
export const BOARD_CAP = 5;

export type MyDrawing = {
  id: string;
  imageUrl: string;
  caption: string | null;
  postedOn: string;
  /** null: a winner, kept forever. */
  keptUntil: string | null;
  win?: "week" | "super";
};

export const MY_DRAWINGS: { board: string; drawings: MyDrawing[] }[] = [
  {
    board: "Office Doodles",
    drawings: [
      {
        id: "d1",
        imageUrl: img("windy-day"),
        caption: "? Windy day",
        postedOn: "1 November",
        keptUntil: "8 December",
      },
      {
        id: "d2",
        imageUrl: img("malfoid"),
        caption: "malfoid",
        postedOn: "21 October",
        keptUntil: null,
        win: "super",
      },
      {
        id: "d3",
        imageUrl: img("lol"),
        caption: "LOL",
        postedOn: "17 October",
        keptUntil: "24 November",
      },
    ],
  },
  {
    board: "Friends Board",
    drawings: [
      {
        id: "d4",
        imageUrl: img("mr-hijazi"),
        caption: "mr hijazi",
        postedOn: "30 October",
        keptUntil: null,
        win: "week",
      },
      {
        id: "d5",
        imageUrl: img("no-tung"),
        caption: "No tung?",
        postedOn: "28 October",
        keptUntil: "1 December",
      },
    ],
  },
];

export const TROPHIES = [
  {
    id: "t1",
    kind: "super" as const,
    label: "October's super winner",
    board: "Office Doodles",
    imageUrl: img("malfoid"),
  },
  {
    id: "t2",
    kind: "week" as const,
    label: "Week of 27 October",
    board: "Friends Board",
    imageUrl: img("mr-hijazi"),
  },
  {
    id: "t3",
    kind: "week" as const,
    label: "Week of 13 October",
    board: "Office Doodles",
    imageUrl: img("malfoid"),
  },
  {
    id: "t4",
    kind: "week" as const,
    label: "Week of 22 September",
    board: "Room 12 Art Club",
    imageUrl: img("rina"),
  },
];

export const MY_VOTES = [
  {
    board: "Friends Board",
    cast: 0,
    of: 3,
    note: "Voting closes Sunday",
  },
  {
    board: "Office Doodles",
    cast: 3,
    of: 3,
    note: "All your votes are in",
  },
  {
    board: "Room 12 Art Club",
    cast: 1,
    of: 1,
    note: "Your pick won last week",
  },
];

/** The board shown as the page behind the sidebar. */
export const BOARD_TILES = [
  { file: "windy-day", author: "Ahmad Hijazi#8620", caption: "? Windy day" },
  { file: "lol", author: "Bennett Marceaux#9363", caption: "LOL" },
  { file: "no-tung", author: "Fitz#2944", caption: "No tung?" },
  {
    file: "malfoida-lisa",
    author: "Ricky Liang#7024",
    caption: "malfoida lisa",
  },
  { file: "rina", author: "Mirina#1363", caption: "rina" },
  { file: "mr-hijazi", author: "Kevin A.#7495", caption: "mr hijazi" },
].map((tile) => ({
  id: `proto-${tile.file}`,
  author: tile.author,
  caption: tile.caption,
  isGuest: false,
  isOwn: false,
  imageUrl: img(tile.file),
  createdAt: "",
}));
