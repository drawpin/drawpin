import type { SupabaseClient } from "@supabase/supabase-js";
import { TILES_BUCKET } from "@/app/b/[slug]/tiles";
import {
  buildTrophies,
  buildVoteSummaries,
  computeStats,
  type ProfileStats,
  type SuperWinRow,
  type Trophy,
  type VoteRow,
  type VoteSummary,
  type WeeklyWinRow,
} from "./profile";

const DAY_MS = 24 * 60 * 60 * 1000;

/** What the profile page shows besides the drawings list. */
export type ProfileData = {
  username: string;
  joinedAt: string;
  stats: ProfileStats;
  trophies: Trophy[];
  /** Tiles that won a monthly final, to mark them in the drawings list. */
  superTileIds: Set<string>;
  votes: VoteSummary[];
};

type Venue = { name: string; slug: string; timezone: string };

type WeeklyRow = {
  tile_id: string;
  tiles: { image_path: string };
  weeks: { starts_at: string; venues: Venue };
};

type SuperRow = {
  month: string;
  ends_at: string;
  winner_tile_id: string;
  tiles: { image_path: string };
  venues: Venue;
};

type VoteQueryRow = {
  tile_id: string;
  week_id: string;
  weeks: { posting_ends_at: string; voting_ends_at: string; venues: Venue };
};

/**
 * Everything the profile page needs, in four reads at once and one more only
 * if the account voted on a board whose voting just closed. Filters are by
 * the account id, which is ours, never the request's.
 *
 * @param admin - A service-role client.
 */
export async function loadProfile(
  admin: SupabaseClient,
  userId: string,
  now = new Date(),
): Promise<ProfileData | null> {
  const since = new Date(now.getTime() - 8 * DAY_MS).toISOString();
  const [profile, tiles, weekly, supers, votes] = await Promise.all([
    admin
      .from("profiles")
      .select("username, created_at")
      .eq("id", userId)
      .maybeSingle(),
    admin
      .from("tiles")
      .select("id, weeks!inner(venue_id)")
      .eq("user_id", userId)
      .returns<{ id: string; weeks: { venue_id: string } }[]>(),
    admin
      .from("hall_of_fame")
      .select(
        "tile_id, tiles!inner(user_id, image_path), weeks!inner(starts_at, venues!inner(name, slug, timezone))",
      )
      .eq("tiles.user_id", userId)
      .returns<WeeklyRow[]>(),
    admin
      .from("monthly_finals")
      .select(
        "month, ends_at, winner_tile_id, tiles!inner(user_id, image_path), venues!inner(name, slug, timezone)",
      )
      .eq("tiles.user_id", userId)
      .returns<SuperRow[]>(),
    admin
      .from("votes")
      .select(
        "tile_id, week_id, weeks!inner(posting_ends_at, voting_ends_at, venues!inner(name, slug, timezone))",
      )
      .eq("user_id", userId)
      .gt("weeks.voting_ends_at", since)
      .returns<VoteQueryRow[]>(),
  ]);

  for (const [name, result] of Object.entries({
    profile,
    tiles,
    weekly,
    supers,
    votes,
  })) {
    if (result.error)
      throw new Error(`loadProfile ${name}: ${result.error.message}`);
  }

  // Signed in, but hasn't picked a name yet.
  if (!profile.data) return null;

  const storage = admin.storage.from(TILES_BUCKET);
  const imageUrl = (path: string) => storage.getPublicUrl(path).data.publicUrl;

  const weeklyRows: WeeklyWinRow[] = weekly.data!.map((row) => ({
    tileId: row.tile_id,
    imageUrl: imageUrl(row.tiles.image_path),
    boardName: row.weeks.venues.name,
    boardSlug: row.weeks.venues.slug,
    weekStartsAt: row.weeks.starts_at,
    timezone: row.weeks.venues.timezone,
  }));
  const superRows: SuperWinRow[] = supers.data!.map((row) => ({
    tileId: row.winner_tile_id,
    imageUrl: imageUrl(row.tiles.image_path),
    boardName: row.venues.name,
    boardSlug: row.venues.slug,
    month: row.month,
    endsAt: row.ends_at,
  }));
  const voteRows: VoteRow[] = votes.data!.map((row) => ({
    tileId: row.tile_id,
    weekId: row.week_id,
    boardName: row.weeks.venues.name,
    boardSlug: row.weeks.venues.slug,
    timezone: row.weeks.venues.timezone,
    votingStartsAt: row.weeks.posting_ends_at,
    votingEndsAt: row.weeks.voting_ends_at,
  }));

  // Which of the voted-for tiles won their week: only worth asking about
  // votes in a week that has just closed.
  const closedTileIds = voteRows
    .filter((vote) => new Date(vote.votingEndsAt) <= now)
    .map((vote) => vote.tileId);
  const won = new Set<string>();
  if (closedTileIds.length > 0) {
    const { data, error } = await admin
      .from("hall_of_fame")
      .select("tile_id")
      .in("tile_id", closedTileIds);
    if (error) throw new Error(`loadProfile winners: ${error.message}`);
    for (const row of data) won.add(row.tile_id as string);
  }

  return {
    username: profile.data.username,
    joinedAt: profile.data.created_at,
    stats: computeStats(
      tiles.data!.map((tile) => tile.weeks.venue_id),
      weeklyRows.length,
      superRows.length,
    ),
    trophies: buildTrophies(weeklyRows, superRows),
    superTileIds: new Set(superRows.map((row) => row.tileId)),
    votes: buildVoteSummaries(voteRows, won, now),
  };
}
