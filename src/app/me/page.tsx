import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getOwner } from "@/lib/auth";
import { nameTagFor } from "@/lib/device-id";
import { serverEnv } from "@/lib/env";
import { formatMemberSince, groupDrawings } from "@/lib/profile";
import { loginHref } from "@/lib/sign-in-routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { listMyDrawings } from "@/lib/supabase-my-drawings";
import { loadProfile } from "@/lib/supabase-profile";
import { BoardLayout } from "../b/[slug]/board-look";
import { DrawingsSection } from "./drawings-section";
import { ProfileHeader } from "./profile-header";
import { StatsSection } from "./stats-section";
import { TrophiesSection } from "./trophies-section";
import { VotesSection } from "./votes-section";

export const metadata: Metadata = {
  title: "Your profile · DrawPin",
  robots: { index: false },
};

/**
 * The private profile hub (docs/design/profiles.md, 4): who you are on
 * DrawPin, your numbers, your trophies, this week's votes and every drawing
 * you can still save. Only its owner ever sees it; there is no public
 * profile (ADR-015).
 */
export default async function MePage() {
  await connection();

  const user = await getOwner();
  if (!user) redirect(loginHref("/me"));

  const admin = createAdminClient();
  const [profile, drawings, boardsRun] = await Promise.all([
    loadProfile(admin, user.id),
    listMyDrawings(admin, user.id),
    countBoardsRun(user.id),
  ]);
  // Signed in but no name yet: the welcome flow picks one, then comes back.
  if (!profile) redirect("/welcome?next=/me");

  const tag = nameTagFor(
    user.id,
    profile.username,
    serverEnv().DEVICE_COOKIE_SECRET,
  );

  return (
    <BoardLayout
      header={
        <ProfileHeader
          username={profile.username}
          tag={tag}
          since={formatMemberSince(profile.joinedAt)}
        />
      }
    >
      <div className="flex flex-col gap-12">
        <StatsSection stats={profile.stats} />
        <TrophiesSection trophies={profile.trophies} />
        <VotesSection votes={profile.votes} />
        <DrawingsSection
          groups={groupDrawings(drawings, profile.superTileIds)}
        />
        <section className="border-foreground flex flex-col gap-2 rounded-xl border-2 bg-white p-5 shadow-[4px_4px_0_var(--destructive)]">
          <h2 className="font-black tracking-tight">Your account</h2>
          <p className="text-muted-foreground text-sm">
            Deleting your account deletes your drawings and votes. Winners stay
            in their board&apos;s Hall of Fame, without your name.
          </p>
          {boardsRun > 0 && (
            <p className="text-muted-foreground text-sm">
              You run {boardsRun === 1 ? "a board" : `${boardsRun} boards`}.
              Closing your account closes {boardsRun === 1 ? "it" : "them"} too.
            </p>
          )}
          <Link
            href="/account/delete?next=%2Fme"
            className="text-destructive inline-flex min-h-11 items-center self-start text-sm underline underline-offset-4"
          >
            Delete account
          </Link>
        </section>
      </div>
    </BoardLayout>
  );
}

/** How many boards the account runs, for the delete warning. */
async function countBoardsRun(userId: string): Promise<number> {
  const { count, error } = await createAdminClient()
    .from("venues")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId);
  if (error) throw new Error(`countBoardsRun: ${error.message}`);
  return count ?? 0;
}
