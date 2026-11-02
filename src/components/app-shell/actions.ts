"use server";

import { cookies } from "next/headers";
import { getBoard } from "@/app/b/[slug]/data";
import { getOwner, getSignedInUserId } from "@/lib/auth";
import {
  DEVICE_BOARDS_COOKIE,
  DEVICE_BOARDS_COOKIE_MAX_AGE,
  forgetDeviceVenue,
  parseDeviceBoards,
  rememberDeviceBoard,
} from "@/lib/device-boards";
import {
  hideBoard,
  PIN_LIMIT_MESSAGE,
  pinBoard,
  recordVisit,
  unhideBoard,
  unpinBoard,
} from "@/lib/my-boards";
import {
  loadAccountBoards,
  loadDeviceBoards,
  type SidebarBoard,
} from "@/lib/sidebar-boards";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseMyBoardsStore } from "@/lib/supabase-my-boards";
import { boardActionSchema, undoRemoveSchema, visitSchema } from "./schema";

/** What a sidebar action hands back: the list as it is now, or why not. */
export type SidebarActionResult =
  { ok: true; boards: SidebarBoard[] } | { ok: false; message: string };

const TRY_AGAIN = "That didn't work. Try again.";

async function writeDeviceCookie(value: string): Promise<void> {
  (await cookies()).set(DEVICE_BOARDS_COOKIE, value, {
    path: "/",
    maxAge: DEVICE_BOARDS_COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    // Not httpOnly: it holds nothing secret (src/lib/device-boards.ts).
    httpOnly: false,
  });
}

async function deviceCookie(): Promise<string | undefined> {
  return (await cookies()).get(DEVICE_BOARDS_COOKIE)?.value;
}

/**
 * Remembers that this person opened a board (ADR-015), and returns their
 * list with it at the top.
 *
 * Called by the shell from the browser once a board page is showing, rather
 * than by the page or `src/proxy.ts`:
 * - A Server Component can't set the device cookie, and a Server Action can.
 * - The proxy also runs for prefetches, so it would count boards a link
 *   merely pointed at, and it would need a database read to know a slug is
 *   a real board before remembering it.
 * - The shell lives in the root layout, which doesn't re-render on
 *   client-side navigation; the list this returns is how the sidebar learns
 *   about the board without reloading the page.
 *
 * Signed in, the session is checked from its token, not the auth server: a
 * visit only reorders the account's own list, so an hour-old sign-out isn't
 * worth a round trip on every board view.
 *
 * @returns `null` when the slug isn't a board.
 */
export async function visitBoard(
  input: unknown,
): Promise<SidebarActionResult | null> {
  const parsed = visitSchema.safeParse(input);
  if (!parsed.success) return null;

  try {
    // Resolves a former slug to the board, so the cookie and the list hold
    // the board's current one.
    const [board, userId] = await Promise.all([
      getBoard(parsed.data.slug),
      getSignedInUserId(),
    ]);
    if (!board) return null;

    const admin = createAdminClient();
    if (userId) {
      await recordVisit(userId, board.id, supabaseMyBoardsStore(admin));
      return {
        ok: true,
        boards: (await loadAccountBoards(admin, userId)).boards,
      };
    }

    const value = rememberDeviceBoard(await deviceCookie(), board.slug);
    await writeDeviceCookie(value);
    return { ok: true, boards: await loadDeviceBoards(admin, value) };
  } catch (error) {
    console.error("Could not remember the board", error);
    return { ok: false, message: TRY_AGAIN };
  }
}

/** Pins a board to the top of the account's list. */
export async function pinBoardAction(
  input: unknown,
): Promise<SidebarActionResult> {
  const parsed = boardActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: TRY_AGAIN };

  const owner = await getOwner();
  // Pinning needs an account; the menu doesn't offer it signed out.
  if (!owner) return { ok: false, message: "Sign in to pin boards." };

  const admin = createAdminClient();
  const store = supabaseMyBoardsStore(admin);
  const { venueId } = parsed.data;
  let result = await pinBoard(owner.id, venueId, store);
  if (result === "not-found") {
    // The header's toggle, tapped before the page's own visit was recorded:
    // record it, so the tap isn't lost.
    await recordVisit(owner.id, venueId, store);
    result = await pinBoard(owner.id, venueId, store);
  }
  if (result === "limit-reached") {
    return { ok: false, message: PIN_LIMIT_MESSAGE };
  }
  return {
    ok: true,
    boards: (await loadAccountBoards(admin, owner.id)).boards,
  };
}

/** Unpins a board. */
export async function unpinBoardAction(
  input: unknown,
): Promise<SidebarActionResult> {
  const parsed = boardActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: TRY_AGAIN };

  const owner = await getOwner();
  if (!owner) return { ok: false, message: "Sign in to pin boards." };

  const admin = createAdminClient();
  await unpinBoard(owner.id, parsed.data.venueId, supabaseMyBoardsStore(admin));
  return {
    ok: true,
    boards: (await loadAccountBoards(admin, owner.id)).boards,
  };
}

/**
 * "Remove from my boards": hides it on the account, or drops it from the
 * device's cookie when signed out. It comes back when it's opened again.
 */
export async function removeBoardAction(
  input: unknown,
): Promise<SidebarActionResult> {
  const parsed = boardActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: TRY_AGAIN };
  const { venueId } = parsed.data;

  const admin = createAdminClient();
  const store = supabaseMyBoardsStore(admin);
  const owner = await getOwner();
  if (owner) {
    await hideBoard(owner.id, venueId, store);
    return {
      ok: true,
      boards: (await loadAccountBoards(admin, owner.id)).boards,
    };
  }

  const current = await deviceCookie();
  const idsBySlug = await store.resolveSlugs(
    parseDeviceBoards(current).map((board) => board.slug),
  );
  const value = forgetDeviceVenue(current, idsBySlug, venueId);
  await writeDeviceCookie(value);
  return { ok: true, boards: await loadDeviceBoards(admin, value) };
}

/** Undo for {@link removeBoardAction}: puts the row back as it was. */
export async function undoRemoveBoardAction(
  input: unknown,
): Promise<SidebarActionResult> {
  const parsed = undoRemoveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: TRY_AGAIN };
  const { venueId, slug, lastVisitedAt, pinnedAt } = parsed.data;

  const admin = createAdminClient();
  const owner = await getOwner();
  if (owner) {
    await unhideBoard(
      owner.id,
      venueId,
      supabaseMyBoardsStore(admin),
      pinnedAt,
    );
    return {
      ok: true,
      boards: (await loadAccountBoards(admin, owner.id)).boards,
    };
  }

  const value = rememberDeviceBoard(
    await deviceCookie(),
    slug,
    new Date(lastVisitedAt),
  );
  await writeDeviceCookie(value);
  return { ok: true, boards: await loadDeviceBoards(admin, value) };
}
