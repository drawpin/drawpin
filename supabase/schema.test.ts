// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { beforeAll, describe, expect, it } from "vitest";

// Runs the real migrations against Postgres compiled to WASM, so the domain
// rules in docs/PLAN.md are checked without needing Docker.
let db: PGlite;

/** Creates the Supabase-provided objects the migrations expect to exist. */
async function stubSupabaseSchema(instance: PGlite) {
  await instance.exec(`
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create role anon;
    create role authenticated;
    create function auth.uid() returns uuid language sql stable as $fn$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $fn$;
  `);
}

async function applyMigrations(instance: PGlite) {
  const dir = path.join(import.meta.dirname, "migrations");
  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    await instance.exec(readFileSync(path.join(dir, file), "utf8"));
  }
}

/**
 * Inserts an owner, venue, week, two devices, and four tiles, all with fresh
 * ids so each test is independent of the others.
 */
async function seedBoard() {
  const ids = {
    ownerId: crypto.randomUUID(),
    venueId: crypto.randomUUID(),
    weekId: crypto.randomUUID(),
    nextWeekId: crypto.randomUUID(),
    artistDeviceId: crypto.randomUUID(),
    voterDeviceId: crypto.randomUUID(),
    tileIds: [
      crypto.randomUUID(),
      crypto.randomUUID(),
      crypto.randomUUID(),
      crypto.randomUUID(),
    ],
    voterTileId: crypto.randomUUID(),
    slug: `cafe-${crypto.randomUUID().slice(0, 8)}`,
  };

  await db.exec(`
    insert into auth.users (id, email) values ('${ids.ownerId}', '${ids.ownerId}@example.com');
    insert into venues (id, owner_id, name, slug, timezone)
      values ('${ids.venueId}', '${ids.ownerId}', 'Test Cafe', '${ids.slug}', 'America/Chicago');
    insert into weeks (id, venue_id, starts_at, posting_ends_at, voting_ends_at, status)
      values ('${ids.weekId}', '${ids.venueId}',
              '2026-09-07T09:00:00Z', '2026-09-14T09:00:00Z', '2026-09-21T09:00:00Z', 'voting');
    insert into weeks (id, venue_id, starts_at, posting_ends_at, voting_ends_at)
      values ('${ids.nextWeekId}', '${ids.venueId}',
              '2026-09-14T09:00:00Z', '2026-09-21T09:00:00Z', '2026-09-28T09:00:00Z');
    insert into devices (id) values ('${ids.artistDeviceId}'), ('${ids.voterDeviceId}');
    insert into tiles (id, week_id, device_id, image_path) values
      ${ids.tileIds
        .map(
          (id, i) =>
            `('${id}', '${ids.weekId}', '${ids.artistDeviceId}', 'tiles/${i}.webp')`,
        )
        .join(",\n      ")},
      ('${ids.voterTileId}', '${ids.weekId}', '${ids.voterDeviceId}', 'tiles/voter.webp');
  `);

  return ids;
}

beforeAll(async () => {
  db = new PGlite({ extensions: { btree_gist } });
  await stubSupabaseSchema(db);
  await applyMigrations(db);
}, 30_000);

describe("owners", () => {
  it("are created automatically when a user signs up", async () => {
    const userId = crypto.randomUUID();

    await db.exec(
      `insert into auth.users (id, email) values ('${userId}', 'new@example.com');`,
    );

    const result = await db.query<{ email: string }>(
      `select email from owners where id = '${userId}';`,
    );
    expect(result.rows).toEqual([{ email: "new@example.com" }]);
  });
});

describe("venues", () => {
  it("allows only one board per owner", async () => {
    const { ownerId } = await seedBoard();

    await expect(
      db.exec(`insert into venues (owner_id, name, slug, timezone)
               values ('${ownerId}', 'Second Cafe', 'second-cafe', 'UTC');`),
    ).rejects.toThrow();
  });

  it("rejects a slug that isn't url-safe", async () => {
    const ownerId = crypto.randomUUID();
    await db.exec(
      `insert into auth.users (id, email) values ('${ownerId}', '${ownerId}@example.com');`,
    );

    await expect(
      db.exec(`insert into venues (owner_id, name, slug, timezone)
               values ('${ownerId}', 'Bad', 'Not A Slug', 'UTC');`),
    ).rejects.toThrow();
  });
});

describe("tiles", () => {
  it("caps captions at 80 characters", async () => {
    const { weekId, artistDeviceId } = await seedBoard();

    await expect(
      db.exec(`insert into tiles (week_id, device_id, image_path, caption)
               values ('${weekId}', '${artistDeviceId}', 'tiles/x.webp', '${"x".repeat(81)}');`),
    ).rejects.toThrow();
  });

  it("requires a 4-digit tag alongside a username", async () => {
    const { weekId, artistDeviceId } = await seedBoard();

    await expect(
      db.exec(`insert into tiles (week_id, device_id, image_path, display_name)
               values ('${weekId}', '${artistDeviceId}', 'tiles/x.webp', 'Ahmad');`),
    ).rejects.toThrow();

    await expect(
      db.exec(`insert into tiles (week_id, device_id, image_path, display_name, name_tag)
               values ('${weekId}', '${artistDeviceId}', 'tiles/x.webp', 'Ahmad', '4821');`),
    ).resolves.toBeDefined();
  });
});

describe("votes", () => {
  it("allows three votes per device per week and refuses a fourth", async () => {
    const { weekId, voterDeviceId, tileIds } = await seedBoard();

    for (const tileId of tileIds.slice(0, 3)) {
      await db.exec(`insert into votes (week_id, tile_id, device_id)
                     values ('${weekId}', '${tileId}', '${voterDeviceId}');`);
    }

    await expect(
      db.exec(`insert into votes (week_id, tile_id, device_id)
               values ('${weekId}', '${tileIds[3]}', '${voterDeviceId}');`),
    ).rejects.toThrow(/already used its 3 votes/);
  });

  it("refuses a second vote on the same tile", async () => {
    const { weekId, voterDeviceId, tileIds } = await seedBoard();

    await db.exec(`insert into votes (week_id, tile_id, device_id)
                   values ('${weekId}', '${tileIds[0]}', '${voterDeviceId}');`);

    await expect(
      db.exec(`insert into votes (week_id, tile_id, device_id)
               values ('${weekId}', '${tileIds[0]}', '${voterDeviceId}');`),
    ).rejects.toThrow();
  });

  it("refuses a vote on your own tile", async () => {
    const { weekId, voterDeviceId, voterTileId } = await seedBoard();

    await expect(
      db.exec(`insert into votes (week_id, tile_id, device_id)
               values ('${weekId}', '${voterTileId}', '${voterDeviceId}');`),
    ).rejects.toThrow(/cannot vote on its own tile/);
  });

  it("refuses a vote filed under the wrong week", async () => {
    const { nextWeekId, voterDeviceId, tileIds } = await seedBoard();

    await expect(
      db.exec(`insert into votes (week_id, tile_id, device_id)
               values ('${nextWeekId}', '${tileIds[0]}', '${voterDeviceId}');`),
    ).rejects.toThrow(/does not match tile week_id/);
  });
});

describe("daily codes", () => {
  it("refuses the same code at two venues at once, but allows reuse later", async () => {
    const first = await seedBoard();
    const second = await seedBoard();

    await db.exec(`insert into daily_codes (venue_id, code, valid_from, valid_until)
                   values ('${first.venueId}', '12345678',
                           '2026-09-16T09:00:00Z', '2026-09-17T09:00:00Z');`);

    await expect(
      db.exec(`insert into daily_codes (venue_id, code, valid_from, valid_until)
               values ('${second.venueId}', '12345678',
                       '2026-09-16T12:00:00Z', '2026-09-17T12:00:00Z');`),
    ).rejects.toThrow();

    await expect(
      db.exec(`insert into daily_codes (venue_id, code, valid_from, valid_until)
               values ('${second.venueId}', '12345678',
                       '2026-09-20T09:00:00Z', '2026-09-21T09:00:00Z');`),
    ).resolves.toBeDefined();
  });

  it("requires exactly 8 digits", async () => {
    const { venueId } = await seedBoard();

    await expect(
      db.exec(`insert into daily_codes (venue_id, code, valid_from, valid_until)
               values ('${venueId}', 'abcd1234',
                       '2026-09-18T09:00:00Z', '2026-09-19T09:00:00Z');`),
    ).rejects.toThrow();
  });
});

describe("daily posting budget", () => {
  it("keeps one attempt row per device per venue-local day", async () => {
    const { venueId, artistDeviceId } = await seedBoard();

    await db.exec(`insert into post_attempts (venue_id, device_id, local_day, has_posted)
                   values ('${venueId}', '${artistDeviceId}', '2026-09-16', true);`);

    await expect(
      db.exec(`insert into post_attempts (venue_id, device_id, local_day)
               values ('${venueId}', '${artistDeviceId}', '2026-09-16');`),
    ).rejects.toThrow();
  });
});

describe("hall of fame", () => {
  it("only accepts ranks 1 through 7", async () => {
    const { venueId, weekId, tileIds } = await seedBoard();

    await db.exec(`insert into hall_of_fame (venue_id, week_id, tile_id, rank, vote_count)
                   values ('${venueId}', '${weekId}', '${tileIds[0]}', 1, 12);`);

    await expect(
      db.exec(`insert into hall_of_fame (venue_id, week_id, tile_id, rank, vote_count)
               values ('${venueId}', '${weekId}', '${tileIds[1]}', 8, 3);`),
    ).rejects.toThrow();
  });

  it("protects a winning tile from the 30-day purge", async () => {
    const { venueId, weekId, tileIds } = await seedBoard();

    await db.exec(`insert into hall_of_fame (venue_id, week_id, tile_id, rank, vote_count)
                   values ('${venueId}', '${weekId}', '${tileIds[0]}', 1, 12);`);

    await expect(
      db.exec(`delete from tiles where id = '${tileIds[0]}';`),
    ).rejects.toThrow();

    await expect(
      db.exec(`delete from tiles where id = '${tileIds[1]}';`),
    ).resolves.toBeDefined();
  });
});

describe("row level security", () => {
  it("is enabled on every public table", async () => {
    const result = await db.query<{ tablename: string }>(`
      select tablename from pg_tables
      where schemaname = 'public' and not rowsecurity
      order by tablename;
    `);

    expect(result.rows.map((row) => row.tablename)).toEqual([]);
  });
});
