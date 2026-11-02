import { cookies } from "next/headers";
import { getSignedInUserId } from "@/lib/auth";
import { DEVICE_BOARDS_COOKIE } from "@/lib/device-boards";
import { nameTagFor } from "@/lib/device-id";
import { serverEnv } from "@/lib/env";
import { MAX_BOARDS_PER_ACCOUNT } from "@/lib/my-boards";
import {
  loadAccountBoards,
  loadDeviceBoards,
  type SidebarBoard,
} from "@/lib/sidebar-boards";
import { createAdminClient } from "@/lib/supabase/admin";

/** The signed-in person, as the sidebar's "you" row shows them. */
export type SidebarViewer = {
  username: string;
  /** The 4-digit tag after the name, e.g. `4821`. */
  tag: string;
  initial: string;
};

/** Everything the sidebar shows, loaded on the server with the page. */
export type SidebarData = {
  signedIn: boolean;
  /** `null` signed out, or for an account that hasn't picked a name yet. */
  viewer: SidebarViewer | null;
  boards: SidebarBoard[];
  /** The boards the account runs, oldest first. */
  runs: { slug: string; name: string }[];
  /** The most boards one account can run. */
  cap: number;
  /** The boards couldn't be loaded; the rest of the sidebar still shows. */
  boardsFailed: boolean;
};

/**
 * Loads the sidebar for whoever is looking. The session is read from its
 * token (it only shows a page; see `getSignedInUserId`). A failure to load
 * the boards is caught and reported in `boardsFailed`, so it never takes the
 * page down with it.
 */
export async function loadSidebarData(): Promise<SidebarData> {
  const admin = createAdminClient();
  const userId = await getSignedInUserId();

  if (!userId) {
    const value = (await cookies()).get(DEVICE_BOARDS_COOKIE)?.value;
    try {
      return {
        signedIn: false,
        viewer: null,
        boards: await loadDeviceBoards(admin, value),
        runs: [],
        cap: MAX_BOARDS_PER_ACCOUNT,
        boardsFailed: false,
      };
    } catch (error) {
      console.error("Could not load the device's boards", error);
      return {
        signedIn: false,
        viewer: null,
        boards: [],
        runs: [],
        cap: MAX_BOARDS_PER_ACCOUNT,
        boardsFailed: true,
      };
    }
  }

  const [profile, lists] = await Promise.all([
    admin.from("profiles").select("username").eq("id", userId).maybeSingle(),
    loadAccountBoards(admin, userId).catch((error: unknown) => {
      console.error("Could not load the account's boards", error);
      return null;
    }),
  ]);
  if (profile.error) {
    console.error("Could not load the profile", profile.error.message);
  }

  const username: string | null = profile.data?.username ?? null;
  return {
    signedIn: true,
    viewer: username
      ? {
          username,
          // Tags follow the account, as on every drawing it posts.
          tag: nameTagFor(userId, username, serverEnv().DEVICE_COOKIE_SECRET),
          initial: [...username.trim()][0]?.toUpperCase() ?? "?",
        }
      : null,
    boards: lists?.boards ?? [],
    runs: (lists?.runs ?? []).map(({ slug, name }) => ({ slug, name })),
    cap: MAX_BOARDS_PER_ACCOUNT,
    boardsFailed: lists === null,
  };
}
