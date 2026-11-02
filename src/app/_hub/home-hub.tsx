import { Suspense } from "react";
import { getSignedInUserId } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { BoardLayout } from "../b/[slug]/board-look";
import { BoardsSection } from "./boards-section";
import { HubErrorBoundary } from "./hub-error-boundary";
import { HubHeader } from "./hub-header";
import { HubSkeleton } from "./hub-skeleton";
import { JoinStartSection } from "./join-start-section";
import { loadHub } from "./load-hub";
import { TodaySection } from "./today-section";

/** Who is looking, as `/` decides between the hub and the marketing home. */
export type HubViewer = {
  userId: string | null;
  /** `null` signed out, or before the account has picked a name. */
  username: string | null;
};

/**
 * The visitor, read from the session token (it only shows a page; see
 * `getSignedInUserId`) and the profile. A profile that can't be read counts
 * as no name, so the visitor gets the marketing home rather than an error.
 */
export async function loadHubViewer(): Promise<HubViewer> {
  const userId = await getSignedInUserId();
  if (!userId) return { userId: null, username: null };
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();
  if (error) console.error("Could not load the profile", error.message);
  return { userId, username: data?.username ?? null };
}

/** The hub's content, once its boards are loaded. */
async function HubContent({ userId, name }: { userId: string; name: string }) {
  const hub = await loadHub(createAdminClient(), userId);
  const hasBoards = hub.boards.length > 0;
  return (
    <BoardLayout
      header={<HubHeader name={name} cards={hub.today} hasBoards={hasBoards} />}
    >
      <div className="flex flex-col gap-12">
        <TodaySection cards={hub.today} />
        <BoardsSection boards={hub.boards} runs={hub.runs} />
        {/* The join card leads its row, which the empty boards box points
            down to. */}
        <JoinStartSection runs={hub.runs} />
      </div>
    </BoardLayout>
  );
}

/**
 * The home hub (ADR-015; docs/design/profiles.md, section 3): what's
 * waiting today across the account's boards, the boards themselves, and
 * ways to join or start another. It streams in behind a skeleton, and has
 * its own error boundary.
 */
export function HomeHub({ userId, name }: { userId: string; name: string }) {
  return (
    <HubErrorBoundary>
      <Suspense fallback={<HubSkeleton name={name} />}>
        <HubContent userId={userId} name={name} />
      </Suspense>
    </HubErrorBoundary>
  );
}
