import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CardPage, INKED_BUTTON } from "@/app/b/[slug]/board-look";
import { signOut } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { requireOwner } from "@/lib/auth";
import { MAX_BOARDS_PER_ACCOUNT, ownedBoardCount } from "@/lib/my-boards";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseMyBoardsStore } from "@/lib/supabase-my-boards";
import { listTimeZones } from "@/lib/timezones";
import { BOARD_LIMIT_MESSAGE } from "./create-venue";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Set up your board · DrawPin" };

/**
 * Sets up a board. Any signed-in account can, including one that draws
 * (ADR-013), and one that already runs boards can start another, up to
 * {@link MAX_BOARDS_PER_ACCOUNT} (ADR-016).
 */
export default async function SetupPage() {
  // The count changes with the owner's own actions; never serve a stale one.
  await connection();
  const owner = await requireOwner();

  // The service role, after the sign-in check above: `owner_id` isn't one of
  // the venue columns signed-in users may read (docs/ERD.md, Data API
  // grants), so filtering on it with their own client is refused.
  const count = await ownedBoardCount(
    owner.id,
    supabaseMyBoardsStore(createAdminClient()),
  );

  const signedInAs = (
    // Signed in as the wrong address, this page is otherwise a dead end:
    // every other route sends an owner without a board back to it.
    <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-1 text-sm">
      <span>Signed in as {owner.email}.</span>
      <form action={signOut}>
        <Button type="submit" variant="link" size="sm" className="h-auto p-0">
          Sign out
        </Button>
      </form>
    </div>
  );

  if (count >= MAX_BOARDS_PER_ACCOUNT) {
    return (
      <CardPage
        note="That's the most"
        title="You can't start another board"
        intro={<p>{BOARD_LIMIT_MESSAGE}</p>}
      >
        <Link href="/admin" className={INKED_BUTTON}>
          Back to your boards
        </Link>
        {signedInAs}
      </CardPage>
    );
  }

  return (
    <CardPage
      note={count === 0 ? "Nearly there!" : "Another one!"}
      title={count === 0 ? "Set up your board" : "Start a new board"}
      intro={<p>Everyone sees this name when they scan your code.</p>}
    >
      <SetupForm timeZones={listTimeZones()} />
      {count > 0 && (
        <Link
          href="/admin"
          className="text-muted-foreground text-center text-sm underline underline-offset-4"
        >
          Back to your boards
        </Link>
      )}
      {signedInAs}
    </CardPage>
  );
}
