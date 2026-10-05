import type { SupabaseClient } from "@supabase/supabase-js";
import { closedFinals } from "@/lib/monthly-final";
import { ensureFinal, listWeekTimings } from "../final/data";
import { formatAuthor, TILES_BUCKET } from "../tiles";

/** How long a result stays on the board after its voting closes. */
const SHOWN_FOR_MS = 7 * 24 * 60 * 60 * 1000;

/** One place on a podium. */
export type PodiumEntry = {
  place: number;
  tileId: string;
  author: string | null;
  caption: string | null;
  imageUrl: string;
  votes: number;
};

/** A finished vote, ready to be revealed on the board. */
export type Reveal = {
  /** Stable for this result, so each device plays it once. */
  id: string;
  kind: "week" | "month";
  entries: PodiumEntry[];
  /** When its voting closed, for the heading. */
  closedAt: string;
  /** The month a super winner was crowned for, as `YYYY-MM-01`. */
  month?: string;
};

type PodiumRow = {
  place: number;
  tile_id: string;
  display_name: string | null;
  name_tag: string | null;
  caption: string | null;
  image_path: string;
  votes: number;
};

function toEntries(admin: SupabaseClient, rows: PodiumRow[]): PodiumEntry[] {
  const storage = admin.storage.from(TILES_BUCKET);
  return rows.map((row) => ({
    place: row.place,
    tileId: row.tile_id,
    author: formatAuthor(row.display_name, row.name_tag),
    caption: row.caption,
    imageUrl: storage.getPublicUrl(row.image_path).data.publicUrl,
    votes: row.votes,
  }));
}

/**
 * The results a board shows off this week: the week whose voting closed in
 * the last seven days, and a monthly final that closed in that time, if any
 * (docs/PLAN.md v12). A result with no votes has nothing to reveal.
 *
 * Crowns each one first, the same on-demand way the Hall of Fame does
 * (ADR-003), so the podium's first place is always the Hall of Fame's winner.
 *
 * @param admin - A service-role client: crowning writes, and the podium
 * functions read vote counts no one else may.
 * @returns The monthly result first when both are showing.
 */
export async function listReveals(
  admin: SupabaseClient,
  venueId: string,
  timeZone: string,
  now: Date = new Date(),
): Promise<Reveal[]> {
  const since = new Date(now.getTime() - SHOWN_FOR_MS);
  const reveals: Reveal[] = [];

  const finals = closedFinals(
    await listWeekTimings(admin, venueId),
    timeZone,
    now,
  ).filter((window) => window.endsAt > since);
  for (const window of finals.slice(0, 1)) {
    const finalId = await ensureFinal(admin, venueId, window);
    const { error: crownError } = await admin.rpc("finalize_super_winner", {
      p_final_id: finalId,
    });
    if (crownError) throw new Error(`listReveals: ${crownError.message}`);

    const { data, error } = await admin.rpc("final_podium", {
      p_final_id: finalId,
    });
    if (error) throw new Error(`listReveals: ${error.message}`);
    const rows = (data ?? []) as PodiumRow[];
    if (rows.length > 0) {
      reveals.push({
        id: `final:${finalId}`,
        kind: "month",
        entries: toEntries(admin, rows),
        closedAt: window.endsAt.toISOString(),
        month: window.month,
      });
    }
  }

  const { data: week, error: weekError } = await admin
    .from("weeks")
    .select("id, voting_ends_at")
    .eq("venue_id", venueId)
    .lte("voting_ends_at", now.toISOString())
    .gt("voting_ends_at", since.toISOString())
    .order("voting_ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (weekError) throw new Error(`listReveals: ${weekError.message}`);

  if (week) {
    const { error: crownError } = await admin.rpc("finalize_week_winner", {
      p_week_id: week.id,
    });
    if (crownError) throw new Error(`listReveals: ${crownError.message}`);

    const { data, error } = await admin.rpc("week_podium", {
      p_week_id: week.id,
    });
    if (error) throw new Error(`listReveals: ${error.message}`);
    const rows = (data ?? []) as PodiumRow[];
    if (rows.length > 0) {
      reveals.push({
        id: `week:${week.id}`,
        kind: "week",
        entries: toEntries(admin, rows),
        closedAt: week.voting_ends_at,
      });
    }
  }

  return reveals;
}
