import type { ReactElement } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { CardPage, INKED_BUTTON } from "../board-look";
import type { Board } from "../data";
import { continueToBoard } from "./actions";
import { hasAcceptedBoard, LATE_NIGHT_COOKIE } from "./consent";
import type { GatedPage } from "./pages";

/**
 * The one-time warning before a Late Night board (ADR-012), or `null` when
 * there's nothing to warn about: the board is moderated, or this device has
 * already chosen to see it. Rendered on the server in place of the page, so
 * nothing on the board shows before the visitor decides.
 */
export async function lateNightGate(
  board: Board,
  page: GatedPage,
): Promise<ReactElement | null> {
  if (board.moderationLevel !== "late_night") return null;
  const cookieStore = await cookies();
  if (hasAcceptedBoard(cookieStore.get(LATE_NIGHT_COOKIE)?.value, board.id)) {
    return null;
  }
  return <LateNightWarning board={board} page={page} />;
}

function LateNightWarning({ board, page }: { board: Board; page: GatedPage }) {
  return (
    <CardPage
      note="Before you go in"
      title="This board isn't moderated"
      intro={
        <p>
          Drawings and captions on {board.name} go up without being checked, so
          you may see things you&apos;d rather not. Only sexual content
          involving minors is blocked.
        </p>
      }
    >
      <form action={continueToBoard} className="flex flex-col gap-3">
        <input type="hidden" name="slug" value={board.slug} />
        <input type="hidden" name="page" value={page} />
        <button type="submit" className={INKED_BUTTON}>
          Continue to the board
        </button>
        <Link
          href="/"
          className="focus-visible:ring-highlight hover:bg-secondary border-foreground inline-flex h-12 items-center justify-center rounded-xl border-2 bg-white px-4 text-sm font-bold outline-none focus-visible:ring-3"
        >
          Take me back
        </Link>
      </form>
      <p className="text-muted-foreground text-center text-sm">
        <Link
          href={`/b/${board.slug}/rules`}
          className="hover:text-foreground underline underline-offset-4"
        >
          Board rules
        </Link>
      </p>
    </CardPage>
  );
}
