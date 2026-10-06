/**
 * Fills a board on the preview database with a few weeks of drawings, so the
 * UI can be designed and checked against a board that looks lived in: this
 * week's feed, last week open for voting, and a winner in the Hall of Fame.
 *
 *   npm run preview:seed -- <board-slug>
 *
 * - Reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from
 *   `.env.preview.local` (git-ignored), and refuses to run against
 *   production.
 * - Takes the drawings from `preview-seed/` (git-ignored), any `.webp` files,
 *   768px square like a posted tile.
 * - The accounts it posts as are made up, one per name below, with emails at
 *   `drawpin-seed.test`, which can't receive mail.
 * - Running it again replaces what the last run put on that board and leaves
 *   everything else alone.
 */
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { weekBoundsFor } from "../src/lib/venue-time.ts";

const PRODUCTION_REF = "xgrtcnfrfwnyiqwikxax";
const ENV_FILE = ".env.preview.local";
const IMAGE_DIR = "preview-seed";
const BUCKET = "tiles";
const SEED_EMAIL_DOMAIN = "drawpin-seed.test";

const PEOPLE = [
  "Maya Okafor",
  "Theo Lindqvist",
  "Priya Raman",
  "Jonah Whitfield",
  "Lucía Ferreira",
  "Sam Kowalczyk",
  "Noor Haddad",
  "Eli Brennan",
];

const CAPTIONS = [
  "first try",
  null,
  "my cat, probably",
  "don't ask",
  null,
  "drawn on the bus",
  "self portrait",
  null,
  "he's friendly",
  "10 minutes, no undo",
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** The two keys this needs, without loading the whole app's environment. */
function readEnv(): { url: string; serviceKey: string } {
  const text = readFileSync(ENV_FILE, "utf8");
  const read = (name: string) =>
    text.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1]?.trim() || undefined;
  const url = read("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = read("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    throw new Error(
      `${ENV_FILE} needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for the preview project`,
    );
  }
  if (url.includes(PRODUCTION_REF)) {
    throw new Error(
      `${ENV_FILE} points at production. This script only seeds the preview database.`,
    );
  }
  return { url, serviceKey };
}

function must<T>(
  result: { data: T | null; error: { message: string } | null },
  what: string,
): T {
  if (result.error || result.data === null) {
    throw new Error(`${what}: ${result.error?.message ?? "no data"}`);
  }
  return result.data;
}

/** The seed accounts, created the first time and reused after that. */
async function ensureAccounts(admin: SupabaseClient) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`listing users: ${error.message}`);

  const accounts: { id: string; username: string }[] = [];
  for (const [index, username] of PEOPLE.entries()) {
    const email = `seed-${index + 1}@${SEED_EMAIL_DOMAIN}`;
    let id = data.users.find((user) => user.email === email)?.id;
    if (!id) {
      const created = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
      });
      if (created.error) {
        throw new Error(`creating ${email}: ${created.error.message}`);
      }
      id = created.data.user.id;
    }
    must(
      await admin.from("profiles").upsert({ id, username }).select("id"),
      `profile for ${email}`,
    );
    accounts.push({ id, username });
  }
  return accounts;
}

/** A week row for the week `daysAgo` days back, created if it isn't there. */
async function ensureWeek(
  admin: SupabaseClient,
  venueId: string,
  timeZone: string,
  daysAgo: number,
) {
  const bounds = weekBoundsFor(
    new Date(Date.now() - daysAgo * DAY_MS),
    timeZone,
  );
  const startsAt = bounds.startsAt.toISOString();
  const upserted = await admin.from("weeks").upsert(
    {
      venue_id: venueId,
      starts_at: startsAt,
      posting_ends_at: bounds.postingEndsAt.toISOString(),
      voting_ends_at: bounds.votingEndsAt.toISOString(),
    },
    { onConflict: "venue_id,starts_at", ignoreDuplicates: true },
  );
  if (upserted.error) throw new Error(`week: ${upserted.error.message}`);
  const week = must(
    await admin
      .from("weeks")
      .select("id")
      .eq("venue_id", venueId)
      .eq("starts_at", startsAt)
      .single<{ id: string }>(),
    "reading week",
  );
  return { id: week.id, startsAt: bounds.startsAt };
}

async function main() {
  const slug = process.argv[2];
  if (!slug) throw new Error("Usage: npm run preview:seed -- <board-slug>");

  const { url, serviceKey } = readEnv();
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const images = readdirSync(IMAGE_DIR)
    .filter((file) => file.endsWith(".webp"))
    .sort()
    .map((file) => readFileSync(path.join(IMAGE_DIR, file)));
  if (images.length === 0) {
    throw new Error(`Put some 768px .webp drawings in ${IMAGE_DIR}/ first`);
  }

  const venue = must(
    await admin
      .from("venues")
      .select("id, timezone")
      .eq("slug", slug)
      .single<{ id: string; timezone: string }>(),
    `board ${slug}`,
  );
  const accounts = await ensureAccounts(admin);
  const accountIds = accounts.map((account) => account.id);

  // This week posting, last week voting, the week before in the Hall of Fame.
  const thisWeek = await ensureWeek(admin, venue.id, venue.timezone, 0);
  const lastWeek = await ensureWeek(admin, venue.id, venue.timezone, 7);
  const olderWeek = await ensureWeek(admin, venue.id, venue.timezone, 14);
  const weekIds = [thisWeek.id, lastWeek.id, olderWeek.id];

  // Clear the last run: its Hall of Fame entry first (it holds the tile),
  // then its tiles (their votes go with them), then their images.
  const previous = must(
    await admin
      .from("tiles")
      .select("id, image_path, user_id")
      .in("week_id", weekIds)
      .or(`user_id.in.(${accountIds.join(",")}),display_name.eq."Seed guest"`)
      .returns<{ id: string; image_path: string }[]>(),
    "finding the last run",
  );
  if (previous.length > 0) {
    const ids = previous.map((tile) => tile.id);
    must(
      await admin.from("hall_of_fame").delete().in("tile_id", ids).select("id"),
      "clearing the Hall of Fame",
    );
    must(
      await admin.from("tiles").delete().in("id", ids).select("id"),
      "clearing tiles",
    );
    await admin.storage
      .from(BUCKET)
      .remove(previous.map((tile) => tile.image_path));
  }

  const devices = must(
    await admin
      .from("devices")
      .insert(accounts.map(() => ({})))
      .select("id")
      .returns<{ id: string }[]>(),
    "creating devices",
  );

  let imageIndex = 0;
  let captionIndex = 0;
  async function postTile(
    week: { id: string; startsAt: Date },
    person: number | null,
    hoursIn: number,
  ) {
    const id = randomUUID();
    const imagePath = `${venue.id}/${week.id}/${id}.webp`;
    const image = images[imageIndex++ % images.length];
    const upload = await admin.storage.from(BUCKET).upload(imagePath, image, {
      contentType: "image/webp",
      // As the app uploads them: a tile's path is never reused.
      cacheControl: "31536000",
    });
    if (upload.error) throw new Error(`uploading: ${upload.error.message}`);

    const account = person === null ? null : accounts[person];
    // Never in the future, so this week's tiles don't sort ahead of real ones.
    const createdAt = new Date(
      Math.min(
        week.startsAt.getTime() + hoursIn * 3_600_000,
        Date.now() - 60_000,
      ),
    );
    must(
      await admin
        .from("tiles")
        .insert({
          id,
          week_id: week.id,
          device_id: devices[(person ?? 0) % devices.length].id,
          user_id: account?.id ?? null,
          // A guest tile from before ADR-007, still on some boards.
          display_name: account?.username ?? "Seed guest",
          name_tag: String(1000 + Math.floor(Math.random() * 9000)),
          caption: CAPTIONS[captionIndex++ % CAPTIONS.length],
          image_path: imagePath,
          created_at: createdAt.toISOString(),
        })
        .select("id"),
      "posting a tile",
    );
    return id;
  }

  // This week: five people so far, spread over the days.
  for (const [n, person] of [0, 1, 2, 3, 4].entries()) {
    await postTile(thisWeek, person, 10 + n * 20);
  }

  // Last week: six people and one old guest tile, voting open now.
  const lastWeekTiles: { id: string; person: number }[] = [];
  for (const [n, person] of [2, 3, 4, 5, 6, 7].entries()) {
    lastWeekTiles.push({
      id: await postTile(lastWeek, person, 8 + n * 24),
      person,
    });
  }
  await postTile(lastWeek, null, 30);

  // A few votes on it, so it has a result when voting closes. Nobody votes
  // for their own tile, and each account's votes land on different tiles.
  for (const voter of [0, 1]) {
    for (const tile of lastWeekTiles.slice(0, 2)) {
      must(
        await admin
          .from("votes")
          .insert({
            week_id: lastWeek.id,
            tile_id: tile.id,
            user_id: accounts[voter].id,
          })
          .select("id"),
        "voting",
      );
    }
  }

  // The week before: its winner goes straight into the Hall of Fame, since
  // that week's voting has closed and can't take votes any more.
  const winnerId = await postTile(olderWeek, 5, 20);
  await postTile(olderWeek, 0, 40);
  await postTile(olderWeek, 7, 60);
  const existing = await admin
    .from("hall_of_fame")
    .select("id")
    .eq("week_id", olderWeek.id)
    .maybeSingle();
  if (!existing.data) {
    must(
      await admin
        .from("hall_of_fame")
        .insert({
          venue_id: venue.id,
          week_id: olderWeek.id,
          tile_id: winnerId,
          vote_count: 4,
        })
        .select("id"),
      "crowning a winner",
    );
  }

  console.log(
    `Seeded ${slug}: 5 drawings this week, 7 on last week's vote, and a Hall of Fame winner.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
