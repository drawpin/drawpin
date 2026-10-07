"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { boardUrl } from "@/lib/board";
import { serverEnv } from "@/lib/env";
import { replaceJoinCode } from "@/lib/join-code/ensure";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupportedTimeZone } from "@/lib/timezones";
import { moderateVenueName, venueNameSchema } from "@/lib/venue-name";
import { formatBoundary, planTimeZoneChange } from "@/lib/venue-time";
import { blockAuthor } from "./block-account";
import { changeBoardLink } from "./change-board-link";
import { closeBoard, type CloseBoardResult } from "./close-board";
import { removeTile } from "./remove-tile";
import { renameVenue } from "./rename-venue";
import {
  listReportedTiles,
  requireOwnedVenue,
  resolveReports,
  SupabaseBlockStore,
  SupabaseCloseBoardStore,
  SupabaseOwnerTileStore,
} from "./venue";

/** Signs the owner out on this device and returns them to the login page. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(`Could not sign out: ${error.message}`);
  redirect("/login");
}

const pauseSchema = z.object({ paused: z.enum(["true", "false"]) });

/**
 * Pauses or resumes the owner's board. While paused, the board stays readable
 * but refuses new posts (docs/PLAN.md, Owner admin).
 */
export async function setBoardPaused(formData: FormData): Promise<void> {
  const venue = await requireOwnedVenue();
  const parsed = pauseSchema.safeParse({ paused: formData.get("paused") });
  if (!parsed.success) throw new Error("Invalid pause request");

  const { error } = await createAdminClient()
    .from("venues")
    .update({ is_paused: parsed.data.paused === "true" })
    .eq("id", venue.id);

  if (error) throw new Error(`Could not update the board: ${error.message}`);

  revalidatePath("/admin");
}

export type RenameBoardState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "renamed"; name: string };

/**
 * Changes the name shown on the owner's board.
 *
 * Only the display name: the slug, the QR code and the join code are
 * untouched, so nothing printed stops working (issue #105).
 *
 * Revalidates `/admin` alone. Every `/b/[slug]` page calls `connection()`, so
 * none of them is in the full route cache, and `getBoard`'s React `cache()` is
 * per-request memoization that can't go stale — the new name is read fresh on
 * the next request. **If a board page ever becomes cacheable, this action has
 * to revalidate it.**
 */
export async function renameBoardAction(
  _previous: RenameBoardState,
  formData: FormData,
): Promise<RenameBoardState> {
  const venue = await requireOwnedVenue();

  const parsed = venueNameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  const name = parsed.data;
  const check = await moderateVenueName(name, serverEnv());
  if (check.status === "refused") {
    return { status: "error", message: check.message };
  }

  const result = await renameVenue(venue.name, name, async (next) => {
    const { error } = await createAdminClient()
      .from("venues")
      .update({ name: next })
      .eq("id", venue.id);
    return { error };
  });

  if (result === "renamed") {
    // The only record of what a board used to be called. Kept deliberately:
    // if a board is renamed to something abusive, this is how we find out
    // what it was before (issue #105, "No rate limit and no name-history").
    console.info(`Board renamed: ${venue.id} "${venue.name}" -> "${name}"`);
    revalidatePath("/admin");
  }

  return { status: "renamed", name };
}

export type ChangeLinkState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "changed"; url: string };

/**
 * Gives the owner's board a new link built from its current name. The old
 * link, and every QR code printed with it, keeps working: it redirects to the
 * new one (ADR-008).
 */
export async function changeBoardLinkAction(): Promise<ChangeLinkState> {
  const venue = await requireOwnedVenue();

  let slug: string;
  try {
    slug = await changeBoardLink(venue.name, async (next) => {
      const { error } = await createAdminClient().rpc("change_venue_slug", {
        p_venue_id: venue.id,
        p_new_slug: next,
      });
      return { error };
    });
  } catch (error) {
    console.error(error);
    return {
      status: "error",
      message: "We couldn't change your board link. Try again in a minute.",
    };
  }

  // Kept for the same reason as the rename log: what a board used to be.
  console.info(`Board link changed: ${venue.id} ${venue.slug} -> ${slug}`);
  revalidatePath("/admin");
  return { status: "changed", url: boardUrl(serverEnv().SITE_URL, slug) };
}

export type NewCodeState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "changed" };

/**
 * Gives the owner's board a new join code. The old one stops working at once,
 * which is the remedy for a code that has got around (ADR-014).
 */
export async function newJoinCodeAction(): Promise<NewCodeState> {
  const venue = await requireOwnedVenue();

  try {
    await replaceJoinCode(createAdminClient(), venue.id);
  } catch (error) {
    console.error(error);
    return {
      status: "error",
      message:
        "We couldn't make a new code. Your code hasn't changed; try again in a minute.",
    };
  }

  // The code itself stays out of the logs: it opens the board.
  console.info(`Board code replaced: ${venue.id}`);
  revalidatePath("/admin");
  return { status: "changed" };
}

export type TimeZoneState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "saved" };

/**
 * Changes the board's time zone from the end of this posting week, or
 * cancels a change that hasn't taken over yet (ADR-008). The week under way
 * keeps its boundaries; see `planTimeZoneChange` for everything else.
 */
export async function setTimeZoneAction(
  _previous: TimeZoneState,
  formData: FormData,
): Promise<TimeZoneState> {
  const venue = await requireOwnedVenue();

  const zone = formData.get("timezone");
  if (typeof zone !== "string" || !isSupportedTimeZone(zone)) {
    return { status: "error", message: "Choose a time zone from the list." };
  }

  const plan = planTimeZoneChange(new Date(), venue.clock, zone);
  if (plan.status === "unchanged") return { status: "saved" };
  if (plan.status === "settling") {
    return {
      status: "error",
      message: `Your last change is still taking effect. You can change the time zone again from ${formatBoundary(plan.until, venue.clock.change?.timeZone ?? zone)}.`,
    };
  }

  const { error } = await createAdminClient().rpc("set_venue_clock", {
    p_venue_id: venue.id,
    p_timezone: plan.clock.timeZone,
    p_next_timezone: plan.clock.change?.timeZone ?? null,
    p_timezone_changes_at: plan.clock.change?.from.toISOString() ?? null,
    p_week_posting_ends_at: plan.week.postingEndsAt.toISOString(),
    p_week_voting_ends_at: plan.week.votingEndsAt.toISOString(),
  });
  if (error) {
    console.error(`Could not change the time zone: ${error.message}`);
    return {
      status: "error",
      message: "We couldn't change your time zone. Try again in a minute.",
    };
  }

  console.info(
    `Board time zone ${plan.status}: ${venue.id} ${venue.clock.timeZone} -> ${zone}`,
  );
  revalidatePath("/admin");
  return { status: "saved" };
}

const removeSchema = z.object({ tileId: z.guid() });

export type RemoveTileState =
  { status: "idle" } | { status: "error"; message: string };

/**
 * Removes a tile from the owner's board: the moderation backstop for anything
 * automatic checks miss.
 */
export async function removeTileAction(
  _previous: RemoveTileState,
  formData: FormData,
): Promise<RemoveTileState> {
  const venue = await requireOwnedVenue();
  const parsed = removeSchema.safeParse({ tileId: formData.get("tileId") });
  if (!parsed.success) {
    return { status: "error", message: "We couldn't remove that tile." };
  }

  const admin = createAdminClient();
  const result = await removeTile(venue.id, parsed.data.tileId, {
    store: new SupabaseOwnerTileStore(admin),
    logError: console.error,
  });

  if (result !== "removed") {
    console.error(`removeTile refused: ${result}`);
    return { status: "error", message: "We couldn't remove that tile." };
  }

  revalidatePath("/admin");
  return { status: "idle" };
}

/** Dismisses the reports against a tile, leaving the tile where it is. */
export async function dismissReportsAction(
  _previous: RemoveTileState,
  formData: FormData,
): Promise<RemoveTileState> {
  const venue = await requireOwnedVenue();
  const parsed = removeSchema.safeParse({ tileId: formData.get("tileId") });
  if (!parsed.success) {
    return { status: "error", message: "We couldn't dismiss those reports." };
  }

  // Only the owner's own board: a tile elsewhere isn't theirs to dismiss.
  const reported = await listReportedTiles(venue.id);
  if (!reported.some((tile) => tile.id === parsed.data.tileId)) {
    return { status: "error", message: "We couldn't dismiss those reports." };
  }

  await resolveReports(parsed.data.tileId);
  revalidatePath("/admin");
  return { status: "idle" };
}

export type BlockState =
  { status: "idle" } | { status: "error"; message: string };

/**
 * Blocks the account behind a drawing from the owner's board and takes down
 * every drawing it has showing there (ADR-008).
 */
export async function blockAccountAction(
  _previous: BlockState,
  formData: FormData,
): Promise<BlockState> {
  const venue = await requireOwnedVenue();
  const parsed = removeSchema.safeParse({ tileId: formData.get("tileId") });
  if (!parsed.success) {
    return { status: "error", message: "We couldn't block that account." };
  }

  const admin = createAdminClient();
  const tiles = new SupabaseOwnerTileStore(admin);
  const result = await blockAuthor(venue.id, parsed.data.tileId, {
    store: new SupabaseBlockStore(admin),
    removeTile: (tileId) =>
      removeTile(venue.id, tileId, { store: tiles, logError: console.error }),
    logError: console.error,
  });

  if (result.status !== "blocked") {
    console.error(`blockAuthor refused: ${result.status}`);
    return { status: "error", message: "We couldn't block that account." };
  }

  revalidatePath("/admin");
  if (result.failed > 0) {
    return {
      status: "error",
      message: `Blocked. ${result.failed} of their drawings couldn't be removed; try removing them one by one.`,
    };
  }
  return { status: "idle" };
}

const unblockSchema = z.object({ userId: z.guid() });

/** Lets a blocked account post, vote and report on the board again. */
export async function unblockAccountAction(
  _previous: BlockState,
  formData: FormData,
): Promise<BlockState> {
  const venue = await requireOwnedVenue();
  const parsed = unblockSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) {
    return { status: "error", message: "We couldn't unblock that account." };
  }

  // Scoped to the owner's own board, so one owner can't lift another's block.
  const { error } = await createAdminClient()
    .from("venue_blocks")
    .delete()
    .eq("venue_id", venue.id)
    .eq("user_id", parsed.data.userId);

  if (error) {
    console.error(`unblockAccountAction failed: ${error.message}`);
    return { status: "error", message: "We couldn't unblock that account." };
  }

  revalidatePath("/admin");
  return { status: "idle" };
}

export type CloseBoardState =
  { status: "idle" } | { status: "error"; message: string };

/**
 * Closes the owner's board for good, then signs them out (ADR-009). The
 * owner confirms by typing the board's name.
 */
export async function closeBoardAction(
  _previous: CloseBoardState,
  formData: FormData,
): Promise<CloseBoardState> {
  const venue = await requireOwnedVenue();
  const typed = formData.get("name");

  let result: CloseBoardResult;
  try {
    result = await closeBoard(venue, typeof typed === "string" ? typed : "", {
      store: new SupabaseCloseBoardStore(createAdminClient()),
      logError: console.error,
    });
  } catch (error) {
    console.error("closeBoardAction failed", error);
    return {
      status: "error",
      message: "We couldn't close your board. Nothing was lost; try again.",
    };
  }

  if (result === "name-mismatch") {
    return {
      status: "error",
      message: "Type your board's name exactly as it's shown to close it.",
    };
  }

  console.info(`Board closed: ${venue.id} "${venue.name}" (${venue.slug})`);
  // The login may already be gone; clearing this device's session is all
  // that's left, and failing to is no reason to stop.
  await (await createClient()).auth.signOut().catch(() => undefined);
  redirect("/");
}
