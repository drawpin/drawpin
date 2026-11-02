import Link from "next/link";
import { CaretDownIcon, PlusIcon } from "@phosphor-icons/react/ssr";
import { MAX_BOARDS_PER_ACCOUNT, type OwnedBoard } from "@/lib/my-boards";
import { adminPath } from "./board-field";

const ITEM =
  "focus-visible:ring-highlight flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold outline-none hover:bg-secondary focus-visible:ring-3";

/**
 * Moves between the boards an account runs (ADR-016), at the top of a
 * board's owner screen: the board on screen, opening to the others and
 * Start a board while there's room for one. A native `<details>`, like the
 * settings shelves, so it works before the page's JavaScript does.
 *
 * Only for an account with two or more boards; with one there's nowhere to
 * switch to.
 */
export function BoardSwitcher({
  current,
  boards,
}: {
  current: OwnedBoard;
  /** Every board the account runs, the current one included. */
  boards: OwnedBoard[];
}) {
  const others = boards.filter((board) => board.venueId !== current.venueId);

  return (
    <details className="group/switcher relative min-w-0">
      <summary className="focus-visible:ring-highlight -mr-2 flex h-11 cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 text-sm font-bold text-white/85 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-3 [&::-webkit-details-marker]:hidden">
        <span className="sr-only">Switch board. Now showing </span>
        <span className="truncate">{current.name}</span>
        <CaretDownIcon
          aria-hidden
          weight="bold"
          className="size-4 shrink-0 transition-transform duration-150 group-open/switcher:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <nav
        aria-label="Your boards"
        className="border-foreground text-foreground absolute top-full right-0 z-20 mt-1 flex w-72 max-w-[calc(100vw-3rem)] flex-col gap-0.5 rounded-xl border-2 bg-white p-1.5 shadow-[4px_4px_0_var(--foreground)]"
      >
        <p className="text-muted-foreground px-3 pt-1.5 pb-1 text-xs font-semibold">
          {boards.length} of {MAX_BOARDS_PER_ACCOUNT} boards
        </p>
        {others.map((board) => (
          <Link
            key={board.venueId}
            href={adminPath(board.slug)}
            className={ITEM}
          >
            <span className="truncate">{board.name}</span>
          </Link>
        ))}
        <Link href="/admin" className={`${ITEM} text-muted-foreground`}>
          All your boards
        </Link>
        {boards.length < MAX_BOARDS_PER_ACCOUNT && (
          <Link
            href="/setup"
            className={`${ITEM} border-foreground border-t-2 pt-1`}
          >
            <PlusIcon weight="bold" className="size-4 shrink-0" />
            Start a board
          </Link>
        )}
      </nav>
    </details>
  );
}
