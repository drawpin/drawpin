import Image from "next/image";
import Link from "next/link";
import {
  ArrowSquareOutIcon,
  FlagIcon,
  GearSixIcon,
  PlusIcon,
} from "@phosphor-icons/react/ssr";
import { INKED_BUTTON } from "../../../b/[slug]/board-look";
import { OUTLINE_BUTTON } from "../../../_home/type";
import { BOARD_CAP, BOARDS, type ProtoBoard } from "../_proto/data";
import { shellProps } from "../_proto/params";
import { ShellHeader } from "../_proto/pages";
import { AppShell } from "../_proto/shell";

const EXTRA: ProtoBoard[] = [
  { ...BOARDS[2], slug: "night-class", name: "Night Class", owned: true },
  { ...BOARDS[4], slug: "the-cousins", name: "The Cousins", owned: true },
  { ...BOARDS[1], slug: "lunch-crew", name: "Lunch Crew", owned: true },
];

/** One board you run: name, link, this week, reports, and the way in. */
function RunCard({
  board,
  reported,
  paused,
}: {
  board: ProtoBoard;
  reported: number;
  paused: boolean;
}) {
  return (
    <li className="border-foreground flex flex-col gap-4 rounded-xl border-2 bg-white p-4 shadow-[5px_5px_0_var(--primary)] sm:flex-row sm:items-center">
      <span className="flex -space-x-3" aria-hidden>
        {board.latest.map((url, index) => (
          <Image
            key={url + index}
            src={url}
            alt=""
            width={56}
            height={56}
            unoptimized
            className="border-foreground size-14 rounded-md border-2 bg-white object-cover"
            style={{ rotate: `${[-4, 2, -1][index]}deg` }}
          />
        ))}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-xl leading-tight font-black tracking-tight">
          {board.name}
        </h2>
        <p className="text-muted-foreground truncate text-sm">
          drawpin.io/b/{board.slug}
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm font-semibold">
          {paused ? (
            <span className="flex items-center gap-1.5">
              <span className="border-foreground bg-winner size-2.5 rounded-full border-2" />
              Paused
            </span>
          ) : (
            <span>{board.drawingsThisWeek} drawings this week</span>
          )}
          {reported > 0 && (
            <span className="border-foreground bg-attention inline-flex items-center gap-1 rounded-md border-2 px-1.5 text-xs font-bold">
              <FlagIcon weight="fill" className="size-3" />
              {reported} reported
            </span>
          )}
        </p>
      </div>
      <div className="flex gap-2">
        <Link
          href="/prototype/profiles/admin/board"
          className={`${INKED_BUTTON} h-11 flex-1 px-4 text-[15px] sm:flex-none`}
        >
          <GearSixIcon weight="bold" className="size-5" />
          Manage
        </Link>
        <Link
          href="/prototype/profiles/board"
          aria-label={`Open ${board.name}`}
          className={`${OUTLINE_BUTTON} h-11 px-3`}
        >
          <ArrowSquareOutIcon weight="bold" className="size-5" />
        </Link>
      </div>
    </li>
  );
}

/**
 * PROTOTYPE: /admin as the list of boards you run, under the cap (2 of 5)
 * and at it (`?cap=1`, 5 of 5).
 */
export default async function ProtoAdmin({
  searchParams,
}: PageProps<"/prototype/profiles/admin">) {
  const query = await searchParams;
  const atCap = query.cap === "1";
  const runs = BOARDS.filter((board) => board.owned);
  const mine = atCap ? [...runs, ...EXTRA] : runs;
  const shell = shellProps(query);
  return (
    <AppShell {...shell} runs={mine} current="admin">
      <ShellHeader>
        <p className="text-sm font-bold text-white/85">
          {mine.length} of {BOARD_CAP}
        </p>
        <h1 className="-mt-2 text-4xl leading-[1.02] font-black tracking-tight">
          Boards you run
        </h1>
        <p className="max-w-md text-white/85">
          Each board has its own code, drawings and settings.
        </p>
      </ShellHeader>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 pt-10 pb-6">
        <ul className="flex flex-col gap-5">
          {mine.map((board, index) => (
            <RunCard
              key={board.slug}
              board={board}
              reported={index === 0 ? 2 : 0}
              paused={index === 1}
            />
          ))}
        </ul>
        {atCap ? (
          <div className="border-foreground/40 text-muted-foreground flex flex-col gap-1 rounded-xl border-2 border-dashed px-5 py-5">
            <p className="text-foreground font-black">
              You run {BOARD_CAP} boards, the most one account can.
            </p>
            <p className="text-sm">
              To start another, close one you don&apos;t use any more. You can
              close a board from its settings.
            </p>
          </div>
        ) : (
          <Link
            href="#"
            className="border-foreground hover:bg-secondary focus-visible:ring-highlight flex items-center gap-4 rounded-xl border-2 border-dashed bg-white px-5 py-5 outline-none focus-visible:ring-3"
          >
            <span className="border-foreground bg-winner flex size-12 shrink-0 items-center justify-center rounded-xl border-2 shadow-[3px_3px_0_var(--foreground)]">
              <PlusIcon weight="bold" className="size-6" />
            </span>
            <span>
              <span className="block text-lg font-black tracking-tight">
                Start a board
              </span>
              <span className="text-muted-foreground block text-sm">
                Name it, pick its time zone, print the code. You can run{" "}
                {BOARD_CAP - mine.length} more.
              </span>
            </span>
          </Link>
        )}
      </main>
    </AppShell>
  );
}
