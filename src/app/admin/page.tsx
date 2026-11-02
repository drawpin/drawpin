import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ArrowRightIcon, PlusIcon } from "@phosphor-icons/react/ssr";
import { CardPage, INKED_BUTTON } from "@/app/b/[slug]/board-look";
import { Button } from "@/components/ui/button";
import { requireOwner } from "@/lib/auth";
import { listOwnedBoards, MAX_BOARDS_PER_ACCOUNT } from "@/lib/my-boards";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseMyBoardsStore } from "@/lib/supabase-my-boards";
import { signOut } from "./actions";
import { adminPath } from "./board-field";
import { adminDestination } from "./destination";

export const metadata: Metadata = { title: "Your boards · DrawPin" };

/**
 * `/admin`, where every "Manage my board" link and every sign-in lands
 * (ADR-016). Signed out, it's the sign-in; with no board, setup; with one,
 * that board's owner screen. Only an account with several boards sees this
 * page: its boards, oldest first, and Start a board while there's room.
 */
export default async function AdminIndexPage() {
  // Boards come and go with the owner's own actions; never serve a stale list.
  await connection();

  const owner = await requireOwner();
  const destination = adminDestination(
    await listOwnedBoards(owner.id, supabaseMyBoardsStore(createAdminClient())),
  );
  if (destination.kind === "redirect") redirect(destination.to);

  const { boards } = destination;
  return (
    <CardPage
      note="Your boards"
      title="Which board?"
      intro={
        <p>
          You run {boards.length} of {MAX_BOARDS_PER_ACCOUNT} boards.
        </p>
      }
    >
      <ul className="flex flex-col gap-2.5">
        {boards.map((board) => (
          <li key={board.venueId}>
            <Link
              href={adminPath(board.slug)}
              className="border-foreground hover:bg-secondary focus-visible:ring-highlight flex min-h-12 items-center justify-between gap-3 rounded-xl border-2 bg-white px-4 py-2 font-bold outline-none focus-visible:ring-3"
            >
              <span className="min-w-0 break-words">{board.name}</span>
              <ArrowRightIcon weight="bold" className="size-5 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
      {boards.length < MAX_BOARDS_PER_ACCOUNT && (
        <Link href="/setup" className={INKED_BUTTON}>
          <PlusIcon weight="bold" className="size-5" />
          Start a board
        </Link>
      )}
      <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-1 text-sm">
        <span>Signed in as {owner.email}.</span>
        <form action={signOut}>
          <Button type="submit" variant="link" size="sm" className="h-auto p-0">
            Sign out
          </Button>
        </form>
      </div>
    </CardPage>
  );
}
