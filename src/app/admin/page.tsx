import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import {
  ArrowSquareOutIcon,
  FlagIcon,
  GearSixIcon,
  PlusIcon,
} from "@phosphor-icons/react/ssr";
import { BoardLayout, INKED_BUTTON } from "@/app/b/[slug]/board-look";
import { requireOwner } from "@/lib/auth";
import { listOwnedBoards, MAX_BOARDS_PER_ACCOUNT } from "@/lib/my-boards";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseMyBoardsStore } from "@/lib/supabase-my-boards";
import { adminPath } from "./board-field";
import {
  type BoardSummary,
  drawingsLine,
  loadBoardSummaries,
  startCardLine,
} from "./board-summaries";
import { adminDestination } from "./destination";

export const metadata: Metadata = { title: "Boards you run · DrawPin" };

/** The tilt each overlapping thumbnail leans at, as on the design. */
const TILTS = [-4, 2, -1];

/**
 * `/admin`, where every "Manage my board" link and every sign-in lands
 * (ADR-016). Signed out, it's the sign-in; with no board, setup; with one,
 * that board's owner screen. Only an account with several boards sees this
 * page (docs/design/profiles.md, Board runner): a card for each board it
 * runs, oldest first, then Start a board while there's room, or why there
 * isn't.
 */
export default async function AdminIndexPage() {
  // Boards come and go with the owner's own actions; never serve a stale list.
  await connection();

  const owner = await requireOwner();
  const admin = createAdminClient();
  const destination = adminDestination(
    await listOwnedBoards(owner.id, supabaseMyBoardsStore(admin)),
  );
  if (destination.kind === "redirect") redirect(destination.to);

  const boards = await loadBoardSummaries(admin, destination.boards);
  const atCap = boards.length >= MAX_BOARDS_PER_ACCOUNT;

  return (
    <BoardLayout
      header={
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-white/85">
            {boards.length} of {MAX_BOARDS_PER_ACCOUNT}
          </p>
          <h1 className="text-4xl leading-[1.02] font-black tracking-tight">
            Boards you run
          </h1>
          <p className="max-w-md text-white/85">
            Each board has its own code, drawings and settings.
          </p>
        </div>
      }
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <ul aria-label="Boards you run" className="flex flex-col gap-5">
          {boards.map((board) => (
            <RunCard key={board.venueId} board={board} />
          ))}
        </ul>
        {atCap ? <AtTheCap /> : <StartCard count={boards.length} />}
      </div>
    </BoardLayout>
  );
}

/** One board the account runs: its name, link, week and the way in. */
function RunCard({ board }: { board: BoardSummary }) {
  return (
    <li className="border-foreground flex flex-col gap-4 rounded-xl border-2 bg-white p-4 shadow-[5px_5px_0_var(--primary)] sm:flex-row sm:items-center">
      {board.thumbnails.length > 0 && (
        <span className="flex -space-x-3" aria-hidden>
          {board.thumbnails.map((url, index) => (
            <Image
              key={url}
              src={url}
              alt=""
              width={56}
              height={56}
              unoptimized
              className="border-foreground size-14 rounded-md border-2 bg-white object-cover"
              style={{ rotate: `${TILTS[index] ?? 0}deg` }}
            />
          ))}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="text-xl leading-tight font-black tracking-tight break-words">
          {board.name}
        </h2>
        <p className="text-muted-foreground text-sm break-all">
          drawpin.io/b/{board.slug}
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm font-semibold">
          {board.isPaused ? (
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="border-foreground bg-winner size-2.5 rounded-full border-2"
              />
              Paused
            </span>
          ) : (
            <span>{drawingsLine(board.drawingsThisWeek)}</span>
          )}
          {board.reported > 0 && (
            <span className="border-foreground bg-attention inline-flex items-center gap-1 rounded-md border-2 px-1.5 text-xs font-bold">
              <FlagIcon weight="fill" aria-hidden className="size-3" />
              {board.reported} reported
            </span>
          )}
        </p>
      </div>
      <div className="flex gap-2">
        <Link
          href={adminPath(board.slug)}
          className={`${INKED_BUTTON} h-11 flex-1 px-4 text-[15px] sm:flex-none`}
        >
          <GearSixIcon weight="bold" aria-hidden className="size-5" />
          Manage
          <span className="sr-only"> {board.name}</span>
        </Link>
        <Link
          href={`/b/${board.slug}`}
          aria-label={`Open ${board.name}`}
          className="border-foreground hover:bg-secondary focus-visible:ring-highlight inline-flex size-11 shrink-0 items-center justify-center rounded-xl border-2 bg-white outline-none focus-visible:ring-3"
        >
          <ArrowSquareOutIcon weight="bold" aria-hidden className="size-5" />
        </Link>
      </div>
    </li>
  );
}

/** The dashed card that starts another board, while the account has room. */
function StartCard({ count }: { count: number }) {
  return (
    <Link
      href="/setup"
      className="border-foreground hover:bg-secondary focus-visible:ring-highlight flex min-h-11 items-center gap-4 rounded-xl border-2 border-dashed bg-white px-5 py-5 outline-none focus-visible:ring-3"
    >
      <span className="border-foreground bg-winner flex size-12 shrink-0 items-center justify-center rounded-xl border-2 shadow-[3px_3px_0_var(--foreground)]">
        <PlusIcon weight="bold" aria-hidden className="size-6" />
      </span>
      <span>
        <span className="block text-lg font-black tracking-tight">
          Start a board
        </span>
        <span className="text-muted-foreground block text-sm">
          {startCardLine(count)}
        </span>
      </span>
    </Link>
  );
}

/** Why there's no Start a board at the cap, and what to do about it. */
function AtTheCap() {
  return (
    <div className="border-foreground/40 text-muted-foreground flex flex-col gap-1 rounded-xl border-2 border-dashed px-5 py-5">
      <p className="text-foreground font-black">
        You run {MAX_BOARDS_PER_ACCOUNT} boards, the most one account can.
      </p>
      <p className="text-sm">
        To start another, close one you don&apos;t use any more. You can close a
        board from its settings.
      </p>
    </div>
  );
}
