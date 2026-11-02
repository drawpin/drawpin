import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BoardVisit,
  MyBoardsStore,
  OwnedBoard,
  VisitWrite,
} from "./my-boards";

type VisitRow = {
  venue_id: string;
  last_visited_at: string;
  pinned_at: string | null;
  hidden_at: string | null;
  venues: { name: string; slug: string };
};

const VISIT_COLUMNS =
  "venue_id, last_visited_at, pinned_at, hidden_at, venues!inner(name, slug)";

function toVisit(row: VisitRow): BoardVisit {
  return {
    venueId: row.venue_id,
    name: row.venues.name,
    slug: row.venues.slug,
    lastVisitedAt: row.last_visited_at,
    pinnedAt: row.pinned_at,
    hiddenAt: row.hidden_at,
  };
}

/**
 * {@link MyBoardsStore} backed by Supabase.
 *
 * @param admin - A service-role client, as for every other server write
 * (docs/ERD.md, Row level security). `venues.owner_id` isn't readable by the
 * API roles, so owned boards need it anyway. Every query filters on the
 * `userId` the caller checked from the session, never one from the request;
 * `board_visits`' RLS policies are the backstop for anything that reaches
 * the table with a user's token instead.
 */
export function supabaseMyBoardsStore(admin: SupabaseClient): MyBoardsStore {
  return {
    async listVisits(userId, limit) {
      const { data, error } = await admin
        .from("board_visits")
        .select(VISIT_COLUMNS)
        .eq("user_id", userId)
        .is("hidden_at", null)
        .order("pinned_at", { ascending: true, nullsFirst: false })
        .order("last_visited_at", { ascending: false })
        .limit(limit)
        .returns<VisitRow[]>();
      if (error) throw new Error(`listVisits: ${error.message}`);
      return data.map(toVisit);
    },

    async findVisit(userId, venueId) {
      const { data, error } = await admin
        .from("board_visits")
        .select(VISIT_COLUMNS)
        .eq("user_id", userId)
        .eq("venue_id", venueId)
        .maybeSingle<VisitRow>();
      if (error) throw new Error(`findVisit: ${error.message}`);
      return data ? toVisit(data) : null;
    },

    async listVisitsTo(userId, venueIds) {
      if (venueIds.length === 0) return [];
      const { data, error } = await admin
        .from("board_visits")
        .select(VISIT_COLUMNS)
        .eq("user_id", userId)
        .in("venue_id", venueIds)
        .returns<VisitRow[]>();
      if (error) throw new Error(`listVisitsTo: ${error.message}`);
      return data.map(toVisit);
    },

    async writeVisits(userId, visits) {
      // Two upserts, because a bulk upsert writes every column any row
      // names: rows that keep `hidden_at` must not mention it at all.
      const unhide = visits.filter((visit) => visit.unhide);
      const keep = visits.filter((visit) => !visit.unhide);
      const row = (visit: VisitWrite) => ({
        user_id: userId,
        venue_id: visit.venueId,
        last_visited_at: visit.lastVisitedAt,
      });

      for (const [rows, label] of [
        [unhide.map((visit) => ({ ...row(visit), hidden_at: null })), "unhide"],
        [keep.map(row), "keep"],
      ] as const) {
        if (rows.length === 0) continue;
        const { error } = await admin
          .from("board_visits")
          .upsert(rows, { onConflict: "user_id,venue_id" });
        if (error) throw new Error(`writeVisits (${label}): ${error.message}`);
      }
    },

    async countPinned(userId) {
      const { count, error } = await admin
        .from("board_visits")
        .select("venue_id", { count: "exact", head: true })
        .eq("user_id", userId)
        .not("pinned_at", "is", null);
      if (error) throw new Error(`countPinned: ${error.message}`);
      return count ?? 0;
    },

    async setPinned(userId, venueId, pinnedAt) {
      const { data, error } = await admin
        .from("board_visits")
        .update({ pinned_at: pinnedAt })
        .eq("user_id", userId)
        .eq("venue_id", venueId)
        .select("venue_id");
      if (error) throw new Error(`setPinned: ${error.message}`);
      return data.length > 0;
    },

    async setHidden(userId, venueId, hiddenAt) {
      const { data, error } = await admin
        .from("board_visits")
        .update({ hidden_at: hiddenAt, pinned_at: null })
        .eq("user_id", userId)
        .eq("venue_id", venueId)
        .select("venue_id");
      if (error) throw new Error(`setHidden: ${error.message}`);
      return data.length > 0;
    },

    async resolveSlugs(slugs) {
      const resolved = new Map<string, string>();
      if (slugs.length === 0) return resolved;

      const [current, former] = await Promise.all([
        admin.from("venues").select("id, slug").in("slug", slugs),
        admin.from("former_slugs").select("slug, venue_id").in("slug", slugs),
      ]);
      if (current.error)
        throw new Error(`resolveSlugs: ${current.error.message}`);
      if (former.error)
        throw new Error(`resolveSlugs: ${former.error.message}`);

      // A slug is one namespace across both tables, so at most one matches.
      for (const row of former.data) resolved.set(row.slug, row.venue_id);
      for (const row of current.data) resolved.set(row.slug, row.id);
      return resolved;
    },

    async listOwnedBoards(userId): Promise<OwnedBoard[]> {
      const { data, error } = await admin
        .from("venues")
        .select("id, name, slug")
        .eq("owner_id", userId)
        .order("created_at", { ascending: true });
      if (error) throw new Error(`listOwnedBoards: ${error.message}`);
      return data.map((row) => ({
        venueId: row.id,
        name: row.name,
        slug: row.slug,
      }));
    },

    async countOwnedBoards(userId) {
      const { count, error } = await admin
        .from("venues")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", userId);
      if (error) throw new Error(`countOwnedBoards: ${error.message}`);
      return count ?? 0;
    },
  };
}
