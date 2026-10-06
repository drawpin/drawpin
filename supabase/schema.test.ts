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
    create role service_role;
    -- Mirrors the local Supabase stack, which grants every API role everything
    -- on new public tables; migrations must not rely on it.
    alter default privileges for role postgres in schema public
      grant all on tables to anon, authenticated, service_role;
    create function auth.uid() returns uuid language sql stable as $fn$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $fn$;
    create schema storage;
    create table storage.buckets (
      id text primary key,
      name text not null,
      public boolean default false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
    create publication supabase_realtime;
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
    insert into owners (id, email) values ('${ids.ownerId}', '${ids.ownerId}@example.com');
    insert into venues (id, owner_id, name, slug, timezone)
      values ('${ids.venueId}', '${ids.ownerId}', 'Test Cafe', '${ids.slug}', 'America/Chicago');
    insert into weeks (id, venue_id, starts_at, posting_ends_at, voting_ends_at)
      values ('${ids.weekId}', '${ids.venueId}',
              '2026-09-07T09:00:00Z', '2026-09-14T09:00:00Z', '2026-09-21T09:00:00Z');
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
  it("are not created just by signing in", async () => {
    const userId = crypto.randomUUID();

    await db.exec(
      `insert into auth.users (id, email) values ('${userId}', 'new@example.com');`,
    );

    // Customers sign in too (ADR-004); becoming an owner happens at setup.
    const result = await db.query(
      `select id from owners where id = '${userId}';`,
    );
    expect(result.rows).toEqual([]);
  });

  it("are required before a venue can reference them", async () => {
    const userId = crypto.randomUUID();
    await db.exec(
      `insert into auth.users (id, email) values ('${userId}', 'new@example.com');`,
    );

    await expect(
      db.query(
        `insert into venues (owner_id, name, slug, timezone)
         values ($1, 'Test Cafe', 'cafe-orphan', 'America/Chicago')`,
        [userId],
      ),
    ).rejects.toThrow(/venues_owner_id_fkey/);
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
  /**
   * Puts the seeded week into its voting window relative to now, so these
   * tests don't quietly start failing when the real date moves past the
   * fixed timestamps seedBoard uses.
   */
  async function openVoting(weekId: string) {
    await db.query(
      `update weeks
         set posting_ends_at = now() - interval '1 day',
             voting_ends_at = now() + interval '6 days'
       where id = $1`,
      [weekId],
    );
  }

  /** An account, and the tiles it posted, since only accounts compete. */
  async function seedVoters() {
    const board = await seedBoard();
    await openVoting(board.weekId);

    const artistId = crypto.randomUUID();
    const voterId = crypto.randomUUID();
    await db.exec(`
      insert into auth.users (id, email) values
        ('${artistId}', '${artistId}@example.com'),
        ('${voterId}', '${voterId}@example.com');
      insert into profiles (id, username) values
        ('${artistId}', 'Artist'), ('${voterId}', 'Voter');
    `);

    // The artist's four tiles are votable; the voter's own tile is not.
    await db.query(`update tiles set user_id = $1 where id = any($2::uuid[])`, [
      artistId,
      board.tileIds,
    ]);
    await db.query(`update tiles set user_id = $1 where id = $2`, [
      voterId,
      board.voterTileId,
    ]);

    return { ...board, artistId, voterId };
  }

  const vote = (weekId: string, tileId: string, userId: string) =>
    db.query(
      `insert into votes (week_id, tile_id, user_id) values ($1, $2, $3)`,
      [weekId, tileId, userId],
    );

  it("allows three votes per account per week and refuses a fourth", async () => {
    const { weekId, voterId, tileIds } = await seedVoters();

    for (const tileId of tileIds.slice(0, 3)) {
      await vote(weekId, tileId, voterId);
    }

    await expect(vote(weekId, tileIds[3], voterId)).rejects.toThrow(
      /already used its 3 votes/,
    );
  });

  it("counts an account's votes across every device it uses", async () => {
    const { weekId, voterId, tileIds } = await seedVoters();

    // Nothing here mentions a device: that's the point of the reshape.
    await vote(weekId, tileIds[0], voterId);
    const used = await db.query<{ count: number }>(
      `select count(*)::int as count from votes where week_id = $1 and user_id = $2`,
      [weekId, voterId],
    );

    expect(used.rows[0].count).toBe(1);
  });

  it("refuses a second vote on the same tile", async () => {
    const { weekId, voterId, tileIds } = await seedVoters();

    await vote(weekId, tileIds[0], voterId);

    await expect(vote(weekId, tileIds[0], voterId)).rejects.toThrow();
  });

  it("refuses a vote on your own tile", async () => {
    const { weekId, voterId, voterTileId } = await seedVoters();

    await expect(vote(weekId, voterTileId, voterId)).rejects.toThrow(
      /cannot vote on its own tile/,
    );
  });

  it("refuses a vote on a guest tile", async () => {
    const { weekId, voterId, tileIds } = await seedVoters();
    await db.query(`update tiles set user_id = null where id = $1`, [
      tileIds[0],
    ]);

    await expect(vote(weekId, tileIds[0], voterId)).rejects.toThrow(
      /posted without an account/,
    );
  });

  it("refuses a vote on a removed tile", async () => {
    const { weekId, voterId, tileIds } = await seedVoters();
    await db.query(`update tiles set status = 'removed' where id = $1`, [
      tileIds[0],
    ]);

    await expect(vote(weekId, tileIds[0], voterId)).rejects.toThrow(
      /is not live/,
    );
  });

  it("refuses a vote filed under the wrong week", async () => {
    const { nextWeekId, voterId, tileIds } = await seedVoters();
    await openVoting(nextWeekId);

    await expect(vote(nextWeekId, tileIds[0], voterId)).rejects.toThrow(
      /does not match tile week_id/,
    );
  });

  it("refuses a vote while the week is still taking posts", async () => {
    const { weekId, voterId, tileIds } = await seedVoters();
    await db.query(
      `update weeks set posting_ends_at = now() + interval '1 day' where id = $1`,
      [weekId],
    );

    await expect(vote(weekId, tileIds[0], voterId)).rejects.toThrow(
      /still taking posts/,
    );
  });

  it("refuses a vote after voting has closed", async () => {
    const { weekId, voterId, tileIds } = await seedVoters();
    await db.query(
      `update weeks set voting_ends_at = now() - interval '1 minute' where id = $1`,
      [weekId],
    );

    await expect(vote(weekId, tileIds[0], voterId)).rejects.toThrow(
      /voting has closed/,
    );
  });

  it("keeps votes out of reach of the API roles", async () => {
    for (const role of ["anon", "authenticated"]) {
      const result = await db.query<{ allowed: boolean }>(
        `select has_table_privilege($1, 'public.votes', 'SELECT') as allowed`,
        [role],
      );
      // Live counts stay hidden until voting closes (docs/PLAN.md).
      expect(result.rows[0].allowed).toBe(false);
    }
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
  /** A week being voted on, whose tiles belong to accounts. */
  async function seedVotedWeek() {
    const board = await seedBoard();
    await db.query(
      `update weeks
         set posting_ends_at = now() - interval '1 day',
             voting_ends_at = now() + interval '6 days'
       where id = $1`,
      [board.weekId],
    );

    const artistId = crypto.randomUUID();
    const voterId = crypto.randomUUID();
    await db.exec(`
      insert into auth.users (id, email) values
        ('${artistId}', '${artistId}@example.com'),
        ('${voterId}', '${voterId}@example.com');
      insert into profiles (id, username) values
        ('${artistId}', 'Artist'), ('${voterId}', 'Voter');
    `);
    await db.query(`update tiles set user_id = $1 where id = any($2::uuid[])`, [
      artistId,
      board.tileIds,
    ]);

    return { ...board, artistId, voterId };
  }

  /** Closes voting, which is what makes a week ready to be judged. */
  async function closeVoting(weekId: string) {
    await db.query(
      `update weeks set voting_ends_at = now() - interval '1 minute' where id = $1`,
      [weekId],
    );
  }

  /** Votes have to land while the week is still open, as real ones do. */
  async function addVotes(weekId: string, tileId: string, count: number) {
    for (let i = 0; i < count; i++) {
      const voterId = crypto.randomUUID();
      await db.exec(`
        insert into auth.users (id, email) values ('${voterId}', '${voterId}@example.com');
        insert into profiles (id, username) values ('${voterId}', 'Voter ${i}');
      `);
      await db.query(
        `insert into votes (week_id, tile_id, user_id) values ($1, $2, $3)`,
        [weekId, tileId, voterId],
      );
    }
  }

  const finalize = async (weekId: string) => {
    const result = await db.query<{ finalize_week_winner: string | null }>(
      `select finalize_week_winner($1::uuid)`,
      [weekId],
    );
    return result.rows[0].finalize_week_winner;
  };

  const winnerOf = async (weekId: string) => {
    const result = await db.query<{ tile_id: string; vote_count: number }>(
      `select tile_id, vote_count from hall_of_fame where week_id = $1`,
      [weekId],
    );
    return result.rows;
  };

  it("crowns the most-voted tile", async () => {
    const { weekId, tileIds } = await seedVotedWeek();
    await addVotes(weekId, tileIds[0], 1);
    await addVotes(weekId, tileIds[1], 3);
    await closeVoting(weekId);

    expect(await finalize(weekId)).toBe(tileIds[1]);
    expect(await winnerOf(weekId)).toEqual([
      { tile_id: tileIds[1], vote_count: 3 },
    ]);
  });

  it("breaks a tie with the earlier post", async () => {
    const { weekId, tileIds } = await seedVotedWeek();
    await db.query(`update tiles set created_at = $2 where id = $1`, [
      tileIds[0],
      new Date("2026-09-08T10:00:00Z"),
    ]);
    await db.query(`update tiles set created_at = $2 where id = $1`, [
      tileIds[1],
      new Date("2026-09-08T11:00:00Z"),
    ]);
    await addVotes(weekId, tileIds[0], 2);
    await addVotes(weekId, tileIds[1], 2);
    await closeVoting(weekId);

    expect(await finalize(weekId)).toBe(tileIds[0]);
  });

  it("leaves a week with no votes uncrowned", async () => {
    const { weekId } = await seedVotedWeek();
    await closeVoting(weekId);

    expect(await finalize(weekId)).toBeNull();
    expect(await winnerOf(weekId)).toEqual([]);
  });

  it("never crowns a tile with no account behind it", async () => {
    const { weekId, tileIds } = await seedVotedWeek();
    await addVotes(weekId, tileIds[1], 5);
    await addVotes(weekId, tileIds[0], 1);
    await closeVoting(weekId);
    // What deleting an account leaves behind: the drawing without its owner.
    await db.query(`update tiles set user_id = null where id = $1`, [
      tileIds[1],
    ]);

    expect(await finalize(weekId)).toBe(tileIds[0]);
  });

  it("never crowns a removed tile", async () => {
    const { weekId, tileIds } = await seedVotedWeek();
    await addVotes(weekId, tileIds[0], 5);
    await addVotes(weekId, tileIds[1], 1);
    await closeVoting(weekId);
    await db.query(`update tiles set status = 'removed' where id = $1`, [
      tileIds[0],
    ]);

    expect(await finalize(weekId)).toBe(tileIds[1]);
  });

  it("re-crowns when the owner removes the winner", async () => {
    const { weekId, tileIds } = await seedVotedWeek();
    await addVotes(weekId, tileIds[0], 5);
    await addVotes(weekId, tileIds[1], 2);
    await closeVoting(weekId);
    await finalize(weekId);

    await db.query(`update tiles set status = 'removed' where id = $1`, [
      tileIds[0],
    ]);

    expect(await finalize(weekId)).toBe(tileIds[1]);
    expect(await winnerOf(weekId)).toEqual([
      { tile_id: tileIds[1], vote_count: 2 },
    ]);
  });

  it("clears the entry when the removed winner was the only tile voted for", async () => {
    const { weekId, tileIds } = await seedVotedWeek();
    await addVotes(weekId, tileIds[0], 3);
    await closeVoting(weekId);
    await finalize(weekId);

    await db.query(`update tiles set status = 'removed' where id = $1`, [
      tileIds[0],
    ]);

    expect(await finalize(weekId)).toBeNull();
    expect(await winnerOf(weekId)).toEqual([]);
  });

  it("is safe to call again", async () => {
    const { weekId, tileIds } = await seedVotedWeek();
    await addVotes(weekId, tileIds[0], 2);
    await closeVoting(weekId);

    await finalize(weekId);
    await finalize(weekId);

    // Two people opening the Hall of Fame must not crown the week twice.
    expect(await winnerOf(weekId)).toHaveLength(1);
  });

  it("crowns nothing while voting is still open", async () => {
    const { weekId, tileIds } = await seedVotedWeek();
    await addVotes(weekId, tileIds[0], 2);

    // Still inside the voting window, where counts stay hidden.
    expect(await finalize(weekId)).toBeNull();
    expect(await winnerOf(weekId)).toEqual([]);
  });

  it("brings a venue's whole Hall of Fame up to date at once", async () => {
    const { venueId, weekId, nextWeekId, tileIds } = await seedVotedWeek();
    await addVotes(weekId, tileIds[0], 1);
    await closeVoting(weekId);
    await db.query(
      `update weeks
         set starts_at = now() - interval '22 days',
             posting_ends_at = now() - interval '15 days',
             voting_ends_at = now() - interval '8 days'
       where id = $1`,
      [nextWeekId],
    );

    const result = await db.query<{ finalize_venue_winners: number }>(
      `select finalize_venue_winners($1::uuid)`,
      [venueId],
    );

    // Both closed weeks were considered; only the one with votes is crowned.
    expect(result.rows[0].finalize_venue_winners).toBe(2);
    expect(await winnerOf(weekId)).toHaveLength(1);
    expect(await winnerOf(nextWeekId)).toEqual([]);
  });

  it("is reachable by the server only", async () => {
    for (const routine of ["finalize_week_winner", "finalize_venue_winners"]) {
      const result = await db.query<{ grantee: string }>(
        `select grantee from information_schema.role_routine_grants
         where routine_name = $1 and grantee <> 'postgres'
         order by grantee`,
        [routine],
      );
      expect(result.rows.map((row) => row.grantee)).toEqual(["service_role"]);
    }
  });

  it("keeps one winner per week", async () => {
    const { venueId, weekId, tileIds } = await seedVotedWeek();
    await addVotes(weekId, tileIds[0], 1);
    await closeVoting(weekId);
    await finalize(weekId);

    await expect(
      db.query(
        `insert into hall_of_fame (venue_id, week_id, tile_id, vote_count)
         values ($1, $2, $3, 1)`,
        [venueId, weekId, tileIds[1]],
      ),
    ).rejects.toThrow(/hall_of_fame_one_per_week/);
  });
});

describe("count_recent_posts_from_ip", () => {
  const countSince = async (ipHash: string, since: string) => {
    const result = await db.query<{ count_recent_posts_from_ip: number }>(
      `select count_recent_posts_from_ip($1::text, $2::timestamptz)`,
      [ipHash, since],
    );
    return result.rows[0].count_recent_posts_from_ip;
  };

  it("counts posts from the devices last seen on one network", async () => {
    const { artistDeviceId, voterDeviceId } = await seedBoard();
    await db.query(`update devices set last_ip_hash = 'net-a' where id = $1`, [
      artistDeviceId,
    ]);
    await db.query(`update devices set last_ip_hash = 'net-b' where id = $1`, [
      voterDeviceId,
    ]);

    // seedBoard gives the artist four tiles and the voter one.
    expect(await countSince("net-a", "2000-01-01T00:00:00Z")).toBe(4);
    expect(await countSince("net-b", "2000-01-01T00:00:00Z")).toBe(1);
    expect(await countSince("net-c", "2000-01-01T00:00:00Z")).toBe(0);
  });

  it("only counts posts inside the window", async () => {
    const { artistDeviceId } = await seedBoard();
    await db.query(`update devices set last_ip_hash = 'net-d' where id = $1`, [
      artistDeviceId,
    ]);

    expect(await countSince("net-d", "2100-01-01T00:00:00Z")).toBe(0);
  });

  it("is reachable by the server only", async () => {
    const result = await db.query<{ grantee: string }>(
      `select grantee from information_schema.role_routine_grants
       where routine_name = 'count_recent_posts_from_ip'
         and grantee <> 'postgres'
       order by grantee`,
    );

    // The browser-facing roles can't call it; only the server can.
    expect(result.rows.map((row) => row.grantee)).toEqual(["service_role"]);
  });
});

describe("ensure_daily_code", () => {
  const WINDOW = ["2026-09-17T09:00:00Z", "2026-09-18T09:00:00Z"];

  const ensure = async (venueId: string, window = WINDOW) => {
    const result = await db.query<{ ensure_daily_code: string }>(
      `select ensure_daily_code($1::uuid, $2::timestamptz, $3::timestamptz)`,
      [venueId, ...window],
    );
    return result.rows[0].ensure_daily_code;
  };

  it("makes one 8-digit code and returns it again all day", async () => {
    const { venueId } = await seedBoard();

    const code = await ensure(venueId);

    expect(code).toMatch(/^[0-9]{8}$/);
    expect(await ensure(venueId)).toBe(code);
  });

  it("makes a new code for the next day", async () => {
    const { venueId } = await seedBoard();

    const today = await ensure(venueId);
    const tomorrow = await ensure(venueId, [
      "2026-09-18T09:00:00Z",
      "2026-09-19T09:00:00Z",
    ]);

    expect(tomorrow).not.toBe(today);
  });

  it("gives two venues different codes for the same day", async () => {
    const first = await seedBoard();
    const second = await seedBoard();

    expect(await ensure(first.venueId)).not.toBe(await ensure(second.venueId));
  });

  it("returns the code another request already created", async () => {
    const { venueId } = await seedBoard();
    await db.query(
      `insert into daily_codes (venue_id, code, valid_from, valid_until)
       values ($1, '00000042', $2::timestamptz, $3::timestamptz)`,
      [venueId, ...WINDOW],
    );

    // Two first views of /admin race; the loser must not make a second code.
    expect(await ensure(venueId)).toBe("00000042");
  });

  it("allows only one code per venue per day", async () => {
    const { venueId } = await seedBoard();
    await ensure(venueId);

    await expect(
      db.query(
        `insert into daily_codes (venue_id, code, valid_from, valid_until)
         values ($1, '00000043', $2::timestamptz, $3::timestamptz)`,
        [venueId, ...WINDOW],
      ),
    ).rejects.toThrow(/daily_codes_one_per_window/);
  });

  it("is reachable by the server only", async () => {
    const result = await db.query<{ grantee: string }>(
      `select grantee from information_schema.role_routine_grants
       where routine_name = 'ensure_daily_code' and grantee <> 'postgres'
       order by grantee`,
    );

    expect(result.rows.map((row) => row.grantee)).toEqual(["service_role"]);
  });
});

describe("record_code_attempt", () => {
  const record = async (ipHash: string, windowStart: string) => {
    const result = await db.query<{ record_code_attempt: number }>(
      `select record_code_attempt($1::text, $2::timestamptz)`,
      [ipHash, windowStart],
    );
    return result.rows[0].record_code_attempt;
  };

  it("counts guesses per network per window", async () => {
    expect(await record("net-a", "2026-09-17T15:00:00Z")).toBe(1);
    expect(await record("net-a", "2026-09-17T15:00:00Z")).toBe(2);
    expect(await record("net-b", "2026-09-17T15:00:00Z")).toBe(1);
  });

  it("drops windows that have rolled off, so the table stays small", async () => {
    await record("net-a", "2026-09-17T15:00:00Z");
    await record("net-a", "2026-09-17T15:10:00Z");

    const result = await db.query<{ window_start: Date }>(
      `select window_start from code_attempts`,
    );
    expect(result.rows).toHaveLength(1);
  });

  it("is reachable by the server only", async () => {
    const result = await db.query<{ grantee: string }>(
      `select grantee from information_schema.role_routine_grants
       where routine_name = 'record_code_attempt' and grantee <> 'postgres'
       order by grantee`,
    );

    expect(result.rows.map((row) => row.grantee)).toEqual(["service_role"]);
  });
});

describe("customer accounts", () => {
  /** A customer, which is an auth user with a profile rather than an owner. */
  async function seedCustomer(username = "Ahmad") {
    const id = crypto.randomUUID();
    await db.exec(
      `insert into auth.users (id, email) values ('${id}', '${id}@example.com');
       insert into profiles (id, username) values ('${id}', '${username}');`,
    );
    return id;
  }

  it("keeps owners and customers apart", async () => {
    const customerId = await seedCustomer();

    const owners = await db.query(`select id from owners where id = $1`, [
      customerId,
    ]);
    expect(owners.rows).toEqual([]);
  });

  it("requires a username", async () => {
    const id = crypto.randomUUID();
    await db.exec(
      `insert into auth.users (id, email) values ('${id}', '${id}@example.com');`,
    );

    await expect(
      db.query(`insert into profiles (id, username) values ($1, '   ')`, [id]),
    ).rejects.toThrow(/profiles_username_check/);
  });

  it("lets a tile belong to an account, or to nobody", async () => {
    const { weekId, artistDeviceId } = await seedBoard();
    const customerId = await seedCustomer();

    await db.query(
      `insert into tiles (week_id, device_id, user_id, image_path)
       values ($1, $2, $3, 'tiles/signed-in.webp'), ($1, $2, null, 'tiles/guest.webp')`,
      [weekId, artistDeviceId, customerId],
    );

    const result = await db.query<{ count: number }>(
      `select count(*)::int as count from tiles where week_id = $1 and user_id is null`,
      [weekId],
    );
    // seedBoard's five tiles are all guest tiles, plus the one just added.
    expect(result.rows[0].count).toBe(6);
  });

  it("keeps a tile when its account is deleted, without the account", async () => {
    const { weekId, artistDeviceId } = await seedBoard();
    const customerId = await seedCustomer();
    await db.query(
      `insert into tiles (week_id, device_id, user_id, image_path)
       values ($1, $2, $3, 'tiles/winner.webp')`,
      [weekId, artistDeviceId, customerId],
    );

    // A Hall of Fame winner must survive its author closing their account
    // (docs/PLAN.md, Accounts).
    await db.query(`delete from auth.users where id = $1`, [customerId]);

    const result = await db.query<{ user_id: string | null }>(
      `select user_id from tiles where image_path = 'tiles/winner.webp'`,
    );
    expect(result.rows).toEqual([{ user_id: null }]);
  });
});

describe("account_posts", () => {
  async function seedCustomer() {
    const id = crypto.randomUUID();
    await db.exec(
      `insert into auth.users (id, email) values ('${id}', '${id}@example.com');
       insert into profiles (id, username) values ('${id}', 'Ahmad');`,
    );
    return id;
  }

  it("allows one post per account per venue per day", async () => {
    const { venueId } = await seedBoard();
    const customerId = await seedCustomer();
    const claim = (day: string) =>
      db.query(
        `insert into account_posts (venue_id, user_id, local_day) values ($1, $2, $3)`,
        [venueId, customerId, day],
      );

    await claim("2026-09-16");

    // Whatever device it came from.
    await expect(claim("2026-09-16")).rejects.toThrow(/account_posts_pkey/);
    await expect(claim("2026-09-17")).resolves.toBeDefined();
  });

  it("goes away with the account", async () => {
    const { venueId } = await seedBoard();
    const customerId = await seedCustomer();
    await db.query(
      `insert into account_posts (venue_id, user_id, local_day)
       values ($1, $2, '2026-09-16')`,
      [venueId, customerId],
    );

    await db.query(`delete from auth.users where id = $1`, [customerId]);

    const result = await db.query(
      `select user_id from account_posts where user_id = $1`,
      [customerId],
    );
    expect(result.rows).toEqual([]);
  });
});

describe("monthly final", () => {
  /**
   * A venue with `weekCount` finished weeks in one month, each won by its own
   * artist, and a final that is already open.
   */
  async function seedFinal(weekCount: number) {
    const board = await seedBoard();
    // seedBoard's own weeks would join the month and confuse the counts.
    await db.query(`delete from weeks where venue_id = $1`, [board.venueId]);

    const finalists: { tileId: string; artistId: string; votes: number }[] = [];

    for (let i = 0; i < weekCount; i++) {
      const weekId = crypto.randomUUID();
      const tileId = crypto.randomUUID();
      const artistId = crypto.randomUUID();
      const votes = weekCount - i; // The first week's winner won by the most.

      await db.exec(`
        insert into auth.users (id, email) values ('${artistId}', '${artistId}@example.com');
        insert into profiles (id, username) values ('${artistId}', 'Artist ${i}');
        insert into weeks (id, venue_id, starts_at, posting_ends_at, voting_ends_at)
          values ('${weekId}', '${board.venueId}',
                  '2026-09-0${i + 1}T09:00:00Z',
                  '2026-09-0${i + 1}T10:00:00Z',
                  '2026-09-0${i + 1}T11:00:00Z');
        insert into tiles (id, week_id, device_id, user_id, image_path)
          values ('${tileId}', '${weekId}', '${board.artistDeviceId}', '${artistId}', 'final/${i}.webp');
        insert into hall_of_fame (venue_id, week_id, tile_id, vote_count)
          values ('${board.venueId}', '${weekId}', '${tileId}', ${votes});
      `);

      finalists.push({ tileId, artistId, votes });
    }

    const finalId = (
      await db.query<{ ensure_monthly_final: string }>(
        `select ensure_monthly_final($1::uuid, $2::date, now() - interval '1 day', now() + interval '6 days')`,
        [board.venueId, "2026-09-01"],
      )
    ).rows[0].ensure_monthly_final;

    return { ...board, finalId, finalists };
  }

  /** An account that can vote in the final. */
  async function seedVoter() {
    const id = crypto.randomUUID();
    await db.exec(`
      insert into auth.users (id, email) values ('${id}', '${id}@example.com');
      insert into profiles (id, username) values ('${id}', 'Voter');
    `);
    return id;
  }

  const listFinalists = async (finalId: string) => {
    const result = await db.query<{ tile_id: string }>(
      `select tile_id from list_finalists($1::uuid)`,
      [finalId],
    );
    return result.rows.map((row) => row.tile_id);
  };

  const vote = (finalId: string, tileId: string, userId: string) =>
    db.query(
      `insert into final_votes (final_id, tile_id, user_id) values ($1, $2, $3)`,
      [finalId, tileId, userId],
    );

  const close = (finalId: string) =>
    db.query(
      `update monthly_finals set ends_at = now() - interval '1 minute' where id = $1`,
      [finalId],
    );

  const crown = async (finalId: string) => {
    const result = await db.query<{ finalize_super_winner: string | null }>(
      `select finalize_super_winner($1::uuid)`,
      [finalId],
    );
    return result.rows[0].finalize_super_winner;
  };

  it("takes only the four best-supported winners of a five-week month", async () => {
    const { finalId, finalists } = await seedFinal(5);

    const running = await listFinalists(finalId);

    expect(running).toHaveLength(4);
    // The fifth week's winner, with the fewest votes of its own, misses out.
    expect(running).not.toContain(finalists[4].tileId);
  });

  it("creates one final per venue per month", async () => {
    const { venueId, finalId } = await seedFinal(2);

    const again = await db.query<{ ensure_monthly_final: string }>(
      `select ensure_monthly_final($1::uuid, $2::date, now(), now() + interval '7 days')`,
      [venueId, "2026-09-01"],
    );

    // Two first views must not open two finals.
    expect(again.rows[0].ensure_monthly_final).toBe(finalId);
  });

  it("allows one vote per account, whatever it is cast on", async () => {
    const { finalId, finalists } = await seedFinal(3);
    const voterId = await seedVoter();

    await vote(finalId, finalists[0].tileId, voterId);

    await expect(vote(finalId, finalists[1].tileId, voterId)).rejects.toThrow(
      /final_votes_final_id_user_id_key/,
    );
  });

  it("refuses a vote on your own tile", async () => {
    const { finalId, finalists } = await seedFinal(2);

    await expect(
      vote(finalId, finalists[0].tileId, finalists[0].artistId),
    ).rejects.toThrow(/cannot vote on its own tile/);
  });

  it("refuses a vote on a tile that isn't in the final", async () => {
    const { finalId } = await seedFinal(2);
    const other = await seedFinal(1);
    const voterId = await seedVoter();

    await expect(
      vote(finalId, other.finalists[0].tileId, voterId),
    ).rejects.toThrow(/is not a finalist/);
  });

  it("refuses a vote after the final closes", async () => {
    const { finalId, finalists } = await seedFinal(2);
    const voterId = await seedVoter();
    await close(finalId);

    await expect(vote(finalId, finalists[0].tileId, voterId)).rejects.toThrow(
      /has closed/,
    );
  });

  it("crowns the most-voted finalist", async () => {
    const { finalId, finalists } = await seedFinal(3);
    const first = await seedVoter();
    const second = await seedVoter();
    await vote(finalId, finalists[1].tileId, first);
    await vote(finalId, finalists[1].tileId, second);
    await vote(finalId, finalists[0].tileId, await seedVoter());
    await close(finalId);

    expect(await crown(finalId)).toBe(finalists[1].tileId);
  });

  it("crowns a lone finalist without a vote", async () => {
    const { finalId, finalists } = await seedFinal(1);
    await close(finalId);

    expect(await crown(finalId)).toBe(finalists[0].tileId);
  });

  it("crowns nobody when a real final drew no votes", async () => {
    const { finalId } = await seedFinal(3);
    await close(finalId);

    expect(await crown(finalId)).toBeNull();
  });

  it("crowns nothing while the final is still running", async () => {
    const { finalId, finalists } = await seedFinal(2);
    await vote(finalId, finalists[0].tileId, await seedVoter());

    expect(await crown(finalId)).toBeNull();
  });

  it("is safe to crown twice", async () => {
    const { finalId, finalists } = await seedFinal(2);
    await vote(finalId, finalists[0].tileId, await seedVoter());
    await close(finalId);

    await crown(finalId);
    await crown(finalId);

    const result = await db.query<{ winner_tile_id: string }>(
      `select winner_tile_id from monthly_finals where id = $1`,
      [finalId],
    );
    expect(result.rows).toEqual([{ winner_tile_id: finalists[0].tileId }]);
  });

  it("drops a finalist whose tile the owner removed", async () => {
    const { finalId, finalists } = await seedFinal(3);
    await db.query(`update tiles set status = 'removed' where id = $1`, [
      finalists[0].tileId,
    ]);

    expect(await listFinalists(finalId)).not.toContain(finalists[0].tileId);
  });

  it("keeps final votes out of reach of the API roles", async () => {
    for (const role of ["anon", "authenticated"]) {
      const result = await db.query<{ allowed: boolean }>(
        `select has_table_privilege($1, 'public.final_votes', 'SELECT') as allowed`,
        [role],
      );
      expect(result.rows[0].allowed).toBe(false);
    }
  });
});

describe("tile reports", () => {
  async function seedReporter(name = "Reporter") {
    const id = crypto.randomUUID();
    await db.exec(`
      insert into auth.users (id, email) values ('${id}', '${id}@example.com');
      insert into profiles (id, username) values ('${id}', '${name}');
    `);
    return id;
  }

  const report = async (
    tileId: string,
    userId: string,
    reason = "offensive",
  ) => {
    const result = await db.query<{ record_tile_report: string }>(
      `select record_tile_report($1::uuid, $2::uuid, $3::report_reason)`,
      [tileId, userId, reason],
    );
    return result.rows[0].record_tile_report;
  };

  it("records a report", async () => {
    const { tileIds } = await seedBoard();
    const reporterId = await seedReporter();

    expect(await report(tileIds[0], reporterId)).toBe("recorded");
  });

  it("turns down a second report of the same tile from one account", async () => {
    const { tileIds } = await seedBoard();
    const reporterId = await seedReporter();

    await report(tileIds[0], reporterId);

    // Clearing cookies is no help: reporting is tied to the account.
    expect(await report(tileIds[0], reporterId, "spam")).toBe(
      "already-reported",
    );
  });

  it("counts reports from different accounts separately", async () => {
    const { tileIds } = await seedBoard();

    await report(tileIds[0], await seedReporter("One"));
    await report(tileIds[0], await seedReporter("Two"));

    const result = await db.query<{ count: number }>(
      `select count(*)::int as count from tile_reports where tile_id = $1`,
      [tileIds[0]],
    );
    expect(result.rows[0].count).toBe(2);
  });

  it("stops one account flooding the queue", async () => {
    const board = await seedBoard();
    const reporterId = await seedReporter();

    // Ten tiles reported in a day is plenty; the eleventh waits.
    for (let i = 0; i < 10; i++) {
      const tileId = crypto.randomUUID();
      await db.query(
        `insert into tiles (id, week_id, device_id, image_path)
         values ($1::uuid, $2::uuid, $3::uuid, $4)`,
        [tileId, board.weekId, board.artistDeviceId, `spam/${tileId}.webp`],
      );
      expect(await report(tileId, reporterId)).toBe("recorded");
    }

    expect(await report(board.tileIds[0], reporterId)).toBe("rate-limited");
  });

  it("lets yesterday's reports roll off", async () => {
    const { tileIds } = await seedBoard();
    const reporterId = await seedReporter();
    await report(tileIds[0], reporterId);
    await db.query(
      `update tile_reports set created_at = now() - interval '2 days'
       where user_id = $1`,
      [reporterId],
    );

    expect(await report(tileIds[1], reporterId)).toBe("recorded");
  });

  it("goes away with the tile", async () => {
    const { tileIds } = await seedBoard();
    await report(tileIds[0], await seedReporter());

    await db.query(`delete from tiles where id = $1`, [tileIds[0]]);

    const result = await db.query(
      `select id from tile_reports where tile_id = $1`,
      [tileIds[0]],
    );
    expect(result.rows).toEqual([]);
  });

  it("keeps reports out of reach of the API roles", async () => {
    for (const role of ["anon", "authenticated"]) {
      const result = await db.query<{ allowed: boolean }>(
        `select has_table_privilege($1, 'public.tile_reports', 'SELECT') as allowed`,
        [role],
      );
      // A report names the account that filed it.
      expect(result.rows[0].allowed).toBe(false);
    }
  });
});

describe("cleanup queries", () => {
  const expiredWeeks = async (before: string) => {
    const result = await db.query<{ week_id: string }>(
      `select week_id from list_expired_weeks($1::timestamptz)`,
      [before],
    );
    return result.rows.map((row) => row.week_id);
  };

  const purgeable = async (weekId: string) => {
    const result = await db.query<{ tile_id: string }>(
      `select tile_id from list_purgeable_tiles($1::uuid)`,
      [weekId],
    );
    return result.rows.map((row) => row.tile_id);
  };

  it("finds weeks whose voting closed before the cut-off", async () => {
    const { weekId, nextWeekId } = await seedBoard();
    await db.query(
      `update weeks
         set starts_at = now() - interval '45 days',
             posting_ends_at = now() - interval '38 days',
             voting_ends_at = now() - interval '31 days'
       where id = $1`,
      [weekId],
    );

    const expired = await expiredWeeks(
      new Date(Date.now() - 30 * 86400000).toISOString(),
    );

    expect(expired).toContain(weekId);
    expect(expired).not.toContain(nextWeekId);
  });

  it("leaves an emptied week out, so it isn't swept again", async () => {
    const { weekId } = await seedBoard();
    await db.query(
      `update weeks
         set starts_at = now() - interval '45 days',
             posting_ends_at = now() - interval '38 days',
             voting_ends_at = now() - interval '31 days'
       where id = $1`,
      [weekId],
    );
    await db.query(`delete from tiles where week_id = $1`, [weekId]);

    expect(
      await expiredWeeks(new Date(Date.now() - 30 * 86400000).toISOString()),
    ).not.toContain(weekId);
  });

  it("spares a week's winner", async () => {
    const { venueId, weekId, tileIds } = await seedBoard();
    await db.query(
      `insert into hall_of_fame (venue_id, week_id, tile_id, vote_count)
       values ($1, $2, $3, 3)`,
      [venueId, weekId, tileIds[0]],
    );

    const doomed = await purgeable(weekId);

    // Winners are kept forever (docs/PLAN.md, Data retention).
    expect(doomed).not.toContain(tileIds[0]);
    expect(doomed).toContain(tileIds[1]);
  });

  it("spares a month's super winner", async () => {
    const { venueId, weekId, tileIds } = await seedBoard();
    await db.query(
      `insert into monthly_finals (venue_id, month, starts_at, ends_at, winner_tile_id, winner_vote_count)
       values ($1, '2026-09-01', now() - interval '8 days', now() - interval '1 day', $2, 2)`,
      [venueId, tileIds[1]],
    );

    expect(await purgeable(weekId)).not.toContain(tileIds[1]);
  });

  it("forgets a device that left nothing behind", async () => {
    const id = crypto.randomUUID();
    await db.query(
      `insert into devices (id, first_seen_at) values ($1, now() - interval '100 days')`,
      [id],
    );

    const result = await db.query<{ delete_unused_devices: number }>(
      `select delete_unused_devices($1::timestamptz)`,
      [new Date(Date.now() - 90 * 86400000).toISOString()],
    );

    expect(result.rows[0].delete_unused_devices).toBeGreaterThanOrEqual(1);
    const left = await db.query(`select id from devices where id = $1`, [id]);
    expect(left.rows).toEqual([]);
  });

  it("keeps a device that posted, however old it is", async () => {
    const { artistDeviceId } = await seedBoard();
    await db.query(
      `update devices set first_seen_at = now() - interval '200 days' where id = $1`,
      [artistDeviceId],
    );

    await db.query(`select delete_unused_devices($1::timestamptz)`, [
      new Date(Date.now() - 90 * 86400000).toISOString(),
    ]);

    // Its tiles still point at it.
    const left = await db.query(`select id from devices where id = $1`, [
      artistDeviceId,
    ]);
    expect(left.rows).toHaveLength(1);
  });

  it("is reachable by the server only", async () => {
    for (const routine of [
      "list_expired_weeks",
      "list_purgeable_tiles",
      "delete_unused_devices",
    ]) {
      const result = await db.query<{ grantee: string }>(
        `select grantee from information_schema.role_routine_grants
         where routine_name = $1 and grantee <> 'postgres'
         order by grantee`,
        [routine],
      );
      expect(result.rows.map((row) => row.grantee)).toEqual(["service_role"]);
    }
  });
});

describe("realtime publication", () => {
  it("streams tiles and weeks, and nothing private", async () => {
    const result = await db.query<{ tablename: string }>(
      `select tablename from pg_publication_tables
       where pubname = 'supabase_realtime' order by tablename;`,
    );

    expect(result.rows.map((row) => row.tablename)).toEqual(["tiles", "weeks"]);
  });
});

describe("data API grants", () => {
  const PRIVILEGES = [
    "SELECT",
    "INSERT",
    "UPDATE",
    "DELETE",
    "TRUNCATE",
    "REFERENCES",
    "TRIGGER",
  ];

  async function privileges(role: string, table: string) {
    const result = await db.query<{ privilege: string }>(
      `select privilege from unnest($1::text[]) as privilege
       where has_table_privilege($2, $3, privilege)`,
      [PRIVILEGES, role, `public.${table}`],
    );
    return result.rows.map((row) => row.privilege);
  }

  async function canReadColumn(role: string, table: string, column: string) {
    const result = await db.query<{ allowed: boolean }>(
      `select has_column_privilege($1, $2, $3, 'SELECT') as allowed`,
      [role, `public.${table}`, column],
    );
    return result.rows[0]?.allowed ?? false;
  }

  // Read to the public API as a whole table.
  const publicTables = [
    "weeks",
    "hall_of_fame",
    "profiles",
    "monthly_finals",
    "former_slugs",
  ];

  // Read to the public API, but only some columns: the rest hold internal
  // identifiers the board never shows (20260924190000_restrict_public_columns).
  const columnRestrictedTables = [
    {
      table: "venues",
      readable: [
        "id",
        "name",
        "slug",
        "timezone",
        "is_paused",
        "next_timezone",
        "timezone_changes_at",
      ],
      hidden: ["owner_id"],
    },
    {
      table: "tiles",
      readable: [
        "id",
        "week_id",
        "user_id",
        "display_name",
        "name_tag",
        "caption",
        "image_path",
        "status",
        "created_at",
      ],
      hidden: ["device_id"],
    },
  ];
  const allPublicTables = [
    ...publicTables,
    ...columnRestrictedTables.map((entry) => entry.table),
  ];
  const ownerTables = ["owners", "daily_codes"];
  const privateTables = [
    "devices",
    "votes",
    "post_attempts",
    "code_attempts",
    "account_posts",
    "final_votes",
    "tile_reports",
    "venue_blocks",
    "venue_tallies",
    "venue_artists",
  ];
  const allTables = [...allPublicTables, ...ownerTables, ...privateTables];

  it.each(allTables)("lets the server read and write %s", async (table) => {
    expect(await privileges("service_role", table)).toEqual([
      "SELECT",
      "INSERT",
      "UPDATE",
      "DELETE",
    ]);
  });

  it.each(publicTables)(
    "lets visitors and owners only read %s",
    async (table) => {
      expect(await privileges("anon", table)).toEqual(["SELECT"]);
      expect(await privileges("authenticated", table)).toEqual(["SELECT"]);
    },
  );

  describe.each(columnRestrictedTables)(
    "$table exposes only safe columns to the API",
    ({ table, readable, hidden }) => {
      it.each(readable)("lets visitors read %s", async (column) => {
        expect(await canReadColumn("anon", table, column)).toBe(true);
        expect(await canReadColumn("authenticated", table, column)).toBe(true);
      });

      it.each(hidden)("hides %s from visitors and owners", async (column) => {
        expect(await canReadColumn("anon", table, column)).toBe(false);
        expect(await canReadColumn("authenticated", table, column)).toBe(false);
        // The server still reads it — removal, moderation and counting need it.
        expect(await canReadColumn("service_role", table, column)).toBe(true);
      });

      it("gives visitors no whole-table SELECT, only the columns", async () => {
        expect(await privileges("anon", table)).toEqual([]);
        expect(await privileges("authenticated", table)).toEqual([]);
      });
    },
  );

  it.each(ownerTables)("lets only owners read %s", async (table) => {
    expect(await privileges("anon", table)).toEqual([]);
    expect(await privileges("authenticated", table)).toEqual(["SELECT"]);
  });

  it.each(privateTables)("keeps %s closed to the API", async (table) => {
    expect(await privileges("anon", table)).toEqual([]);
    expect(await privileges("authenticated", table)).toEqual([]);
  });

  it("covers every public table", async () => {
    const result = await db.query<{ tablename: string }>(
      `select tablename from pg_tables where schemaname = 'public' order by tablename`,
    );
    expect(result.rows.map((row) => row.tablename)).toEqual(
      [...allTables].sort(),
    );
  });

  it("gives tables created by later migrations no API access by default", async () => {
    await db.exec(`create table public.grants_probe (id int primary key);`);
    try {
      for (const role of ["anon", "authenticated", "service_role"]) {
        expect(await privileges(role, "grants_probe")).toEqual([]);
      }
    } finally {
      await db.exec(`drop table public.grants_probe;`);
    }
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

describe("weeks", () => {
  it("has no stored status or purge date to drift", async () => {
    const result = await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'weeks'
       order by column_name`,
    );

    // Both were only ever written at creation, with nothing to update them
    // later (ADR-003); the timestamps say everything they said.
    expect(result.rows.map((row) => row.column_name)).toEqual([
      "id",
      "posting_ends_at",
      "starts_at",
      "venue_id",
      "voting_ends_at",
    ]);
  });

  it("drops the enum the status used", async () => {
    const result = await db.query(
      `select typname from pg_type where typname = 'week_status'`,
    );

    expect(result.rows).toEqual([]);
  });

  it("keeps each venue's weeks from overlapping", async () => {
    const { venueId } = await seedBoard();

    // One week per start, so "the week containing now" is always one row.
    await expect(
      db.query(
        `insert into weeks (venue_id, starts_at, posting_ends_at, voting_ends_at)
         values ($1, '2026-09-07T09:00:00Z', '2026-09-14T09:00:00Z', '2026-09-21T09:00:00Z')`,
        [venueId],
      ),
    ).rejects.toThrow(/weeks_venue_id_starts_at_key/);
  });
});

describe("board_stats", () => {
  async function callStats(venueId: string) {
    const result = await db.query<{
      people: number;
      total_drawings: number;
      week_drawings: number;
    }>(`select * from board_stats($1)`, [venueId]);
    const row = result.rows[0];
    return {
      people: Number(row.people),
      total: Number(row.total_drawings),
      week: Number(row.week_drawings),
    };
  }

  it("counts every drawing posted, and only accounts as artists", async () => {
    const { venueId } = await seedBoard();

    // seedBoard: five guest tiles. Guests stopped posting with ADR-007, so a
    // guest tile posted now is a drawing but not an artist; the ones left
    // from before were counted by device when the tally was backfilled.
    const stats = await callStats(venueId);
    expect(stats.people).toBe(0);
    expect(stats.total).toBe(5);
  });

  it("counts an account once, whichever devices it posted from", async () => {
    const { venueId, weekId, artistDeviceId, voterDeviceId } =
      await seedBoard();
    const accountId = crypto.randomUUID();
    await db.exec(
      `insert into auth.users (id, email) values ('${accountId}', '${accountId}@example.com');
       insert into profiles (id, username) values ('${accountId}', 'Ahmad');`,
    );
    const before = await callStats(venueId);

    // One person posts from both of the board's devices on two days.
    await db.query(
      `insert into tiles (week_id, device_id, user_id, image_path) values
         ($1, $2, $4, 'tiles/a.webp'), ($1, $3, $4, 'tiles/b.webp')`,
      [weekId, artistDeviceId, voterDeviceId, accountId],
    );

    const after = await callStats(venueId);
    expect(after.people).toBe(before.people + 1);
    expect(after.total).toBe(before.total + 2);
  });

  it("keeps counting drawings the 30-day clean-up has deleted", async () => {
    const { venueId, weekId } = await seedBoard();

    await db.query(`delete from tiles where week_id = $1`, [weekId]);

    expect((await callStats(venueId)).total).toBe(5);
  });

  it("keeps counting an artist whose account is deleted", async () => {
    const { venueId, weekId, artistDeviceId } = await seedBoard();
    const accountId = crypto.randomUUID();
    await db.exec(
      `insert into auth.users (id, email) values ('${accountId}', '${accountId}@example.com');
       insert into profiles (id, username) values ('${accountId}', 'Leaving');`,
    );
    await db.query(
      `insert into tiles (week_id, device_id, user_id, image_path) values ($1, $2, $3, 'tiles/x.webp')`,
      [weekId, artistDeviceId, accountId],
    );

    await db.query(`select delete_account_tiles($1)`, [accountId]);
    await db.query(`delete from auth.users where id = $1`, [accountId]);

    const stats = await callStats(venueId);
    expect(stats.people).toBe(1);
    expect(stats.total).toBe(6);
  });

  it("counts this week only against the week taking posts now", async () => {
    const { venueId, weekId } = await seedBoard();

    // The seeded week's posting window is in the past, so nothing is "this week".
    expect((await callStats(venueId)).week).toBe(0);

    // Move it over now: all five of its tiles become this week's.
    await db.query(
      `update weeks set starts_at = now() - interval '1 day',
                        posting_ends_at = now() + interval '6 days',
                        voting_ends_at = now() + interval '13 days'
       where id = $1`,
      [weekId],
    );
    expect((await callStats(venueId)).week).toBe(5);
  });

  it("ignores removed tiles", async () => {
    const { venueId, tileIds } = await seedBoard();

    await db.query(`update tiles set status = 'removed' where id = $1`, [
      tileIds[0],
    ]);

    expect((await callStats(venueId)).total).toBe(4);
  });

  it("lets a visitor read the totals without reading a device id", async () => {
    const { venueId } = await seedBoard();

    await db.exec("set role anon");
    try {
      const result = await db.query<{ total_drawings: number }>(
        `select total_drawings from board_stats($1)`,
        [venueId],
      );
      expect(Number(result.rows[0].total_drawings)).toBe(5);

      // The same count by hand is refused: device_id is not the visitor's to read.
      await expect(
        db.query(`select count(distinct device_id) from tiles`),
      ).rejects.toThrow(/permission denied/i);
    } finally {
      await db.exec("reset role");
    }
  });
});

describe("former slugs", () => {
  async function currentSlug(venueId: string) {
    const result = await db.query<{ slug: string }>(
      `select slug from venues where id = $1`,
      [venueId],
    );
    return result.rows[0].slug;
  }

  async function changeSlug(venueId: string, newSlug: string) {
    await db.query(`select change_venue_slug($1, $2)`, [venueId, newSlug]);
  }

  /** A second owner, ready for a venue of their own. */
  async function newOwner() {
    const ownerId = crypto.randomUUID();
    await db.exec(`
      insert into auth.users (id, email) values ('${ownerId}', '${ownerId}@example.com');
      insert into owners (id, email) values ('${ownerId}', '${ownerId}@example.com');
    `);
    return ownerId;
  }

  it("moves a board to its new slug and keeps the old one pointing at it", async () => {
    const { venueId, slug } = await seedBoard();
    const next = `${slug}-moved`;

    await changeSlug(venueId, next);

    expect(await currentSlug(venueId)).toBe(next);
    const former = await db.query<{ venue_id: string }>(
      `select venue_id from former_slugs where slug = $1`,
      [slug],
    );
    expect(former.rows).toEqual([{ venue_id: venueId }]);
  });

  it("keeps every slug a board has had", async () => {
    const { venueId, slug } = await seedBoard();

    await changeSlug(venueId, `${slug}-second`);
    await changeSlug(venueId, `${slug}-third`);

    const former = await db.query<{ slug: string }>(
      `select slug from former_slugs where venue_id = $1 order by slug`,
      [venueId],
    );
    expect(former.rows.map((row) => row.slug)).toEqual([
      slug,
      `${slug}-second`,
    ]);
  });

  it("won't give a former slug to a new board, so old QR codes stay with their board", async () => {
    const { venueId, slug } = await seedBoard();
    await changeSlug(venueId, `${slug}-moved`);

    const ownerId = await newOwner();
    await expect(
      db.query(
        `insert into venues (owner_id, name, slug, timezone)
         values ($1, 'Copycat', $2, 'UTC')`,
        [ownerId, slug],
      ),
    ).rejects.toThrow(/venues_slug_key/);
  });

  it("won't move a board onto a slug another board has given up", async () => {
    const first = await seedBoard();
    await changeSlug(first.venueId, `${first.slug}-moved`);
    const second = await seedBoard();

    await expect(changeSlug(second.venueId, first.slug)).rejects.toThrow(
      /venues_slug_key/,
    );
    expect(await currentSlug(second.venueId)).toBe(second.slug);
  });

  it("won't move a board onto another board's current slug", async () => {
    const first = await seedBoard();
    const second = await seedBoard();

    await expect(changeSlug(second.venueId, first.slug)).rejects.toThrow(
      /venues_slug_key/,
    );
    // Nothing was retired by the failed change.
    const former = await db.query(
      `select 1 from former_slugs where venue_id = $1`,
      [second.venueId],
    );
    expect(former.rows).toEqual([]);
  });

  it("won't retire a slug a board is still using", async () => {
    const first = await seedBoard();
    const second = await seedBoard();

    await expect(
      db.query(`insert into former_slugs (slug, venue_id) values ($1, $2)`, [
        first.slug,
        second.venueId,
      ]),
    ).rejects.toThrow(/venues_slug_key/);
  });

  it("goes when its board does", async () => {
    const { venueId, slug } = await seedBoard();
    await changeSlug(venueId, `${slug}-moved`);

    // Weeks, tiles and devices hold the venue too; clear them first.
    await db.query(
      `delete from tiles where week_id in (select id from weeks where venue_id = $1)`,
      [venueId],
    );
    await db.query(`delete from weeks where venue_id = $1`, [venueId]);
    await db.query(`delete from venues where id = $1`, [venueId]);

    const former = await db.query(
      `select 1 from former_slugs where slug = $1`,
      [slug],
    );
    expect(former.rows).toEqual([]);
  });

  it("lets a visitor follow an old slug but not change one", async () => {
    const { venueId, slug } = await seedBoard();
    await changeSlug(venueId, `${slug}-moved`);

    await db.exec("set role anon");
    try {
      const result = await db.query<{ slug: string }>(
        `select v.slug from former_slugs f join venues v on v.id = f.venue_id
          where f.slug = $1`,
        [slug],
      );
      expect(result.rows).toEqual([{ slug: `${slug}-moved` }]);

      await expect(changeSlug(venueId, `${slug}-hijacked`)).rejects.toThrow(
        /permission denied/i,
      );
    } finally {
      await db.exec("reset role");
    }
  });
});

describe("set_venue_clock", () => {
  async function clockOf(venueId: string) {
    const result = await db.query<{
      timezone: string;
      next_timezone: string | null;
      timezone_changes_at: Date | null;
    }>(
      `select timezone, next_timezone, timezone_changes_at from venues where id = $1`,
      [venueId],
    );
    return result.rows[0];
  }

  async function votingEndOf(weekId: string) {
    const result = await db.query<{ voting_ends_at: Date }>(
      `select voting_ends_at from weeks where id = $1`,
      [weekId],
    );
    return result.rows[0].voting_ends_at.toISOString();
  }

  const scheduleTokyo = (venueId: string) =>
    db.query(`select set_venue_clock($1, $2, $3, $4, $5, $6)`, [
      venueId,
      "America/Chicago",
      "Asia/Tokyo",
      "2026-09-14T09:00:00Z",
      "2026-09-14T09:00:00Z",
      "2026-09-20T19:00:00Z",
    ]);

  it("schedules a change and moves the voting end of the week taking posts", async () => {
    const { venueId, weekId, nextWeekId } = await seedBoard();

    await scheduleTokyo(venueId);

    expect(await clockOf(venueId)).toMatchObject({
      timezone: "America/Chicago",
      next_timezone: "Asia/Tokyo",
    });
    expect(await votingEndOf(weekId)).toBe("2026-09-20T19:00:00.000Z");
    // Any other week is left as it was.
    expect(await votingEndOf(nextWeekId)).toBe("2026-09-28T09:00:00.000Z");
  });

  it("cancels a change and puts the week back", async () => {
    const { venueId, weekId } = await seedBoard();
    await scheduleTokyo(venueId);

    await db.query(`select set_venue_clock($1, $2, null, null, $3, $4)`, [
      venueId,
      "America/Chicago",
      "2026-09-14T09:00:00Z",
      "2026-09-21T09:00:00Z",
    ]);

    expect(await clockOf(venueId)).toEqual({
      timezone: "America/Chicago",
      next_timezone: null,
      timezone_changes_at: null,
    });
    expect(await votingEndOf(weekId)).toBe("2026-09-21T09:00:00.000Z");
  });

  it("refuses a change without its time", async () => {
    const { venueId } = await seedBoard();

    await expect(
      db.query(`update venues set next_timezone = $2 where id = $1`, [
        venueId,
        "Asia/Tokyo",
      ]),
    ).rejects.toThrow(/venues_timezone_change_complete/);
  });

  it("is for the server alone", async () => {
    const { venueId } = await seedBoard();

    await db.exec("set role authenticated");
    try {
      await expect(
        db.query(`select set_venue_clock($1, $2, null, null, now(), now())`, [
          venueId,
          "UTC",
        ]),
      ).rejects.toThrow(/permission denied/i);
    } finally {
      await db.exec("reset role");
    }
  });
});

describe("venue blocks", () => {
  /** A board, with an account that is blocked from it. */
  async function seedBlocked() {
    const board = await seedBoard();
    const userId = crypto.randomUUID();
    await db.exec(`
      insert into auth.users (id, email) values ('${userId}', '${userId}@example.com');
      insert into profiles (id, username) values ('${userId}', 'Blocked');
      insert into venue_blocks (venue_id, user_id) values ('${board.venueId}', '${userId}');
    `);
    return { ...board, userId };
  }

  const BLOCKED = /is blocked from this board/;

  it("refuses a post from a blocked account", async () => {
    const { weekId, artistDeviceId, userId } = await seedBlocked();

    await expect(
      db.query(
        `insert into tiles (week_id, device_id, user_id, image_path)
         values ($1, $2, $3, 'tiles/blocked.webp')`,
        [weekId, artistDeviceId, userId],
      ),
    ).rejects.toThrow(BLOCKED);
  });

  it("refuses a vote from a blocked account", async () => {
    const { weekId, tileIds, userId } = await seedBlocked();
    await db.query(
      `update weeks set posting_ends_at = now() - interval '1 day',
                        voting_ends_at = now() + interval '6 days'
        where id = $1`,
      [weekId],
    );

    await expect(
      db.query(
        `insert into votes (week_id, tile_id, user_id) values ($1, $2, $3)`,
        [weekId, tileIds[0], userId],
      ),
    ).rejects.toThrow(BLOCKED);
  });

  it("refuses a report from a blocked account", async () => {
    const { tileIds, userId } = await seedBlocked();

    await expect(
      db.query(`select record_tile_report($1::uuid, $2::uuid, 'spam')`, [
        tileIds[0],
        userId,
      ]),
    ).rejects.toThrow(BLOCKED);
  });

  it("refuses a final vote from a blocked account", async () => {
    const { venueId, tileIds, userId } = await seedBlocked();
    const finalId = crypto.randomUUID();
    await db.query(
      `insert into monthly_finals (id, venue_id, month, starts_at, ends_at)
       values ($1, $2, '2026-09-01', now() - interval '1 day', now() + interval '6 days')`,
      [finalId, venueId],
    );

    await expect(
      db.query(
        `insert into final_votes (final_id, tile_id, user_id) values ($1, $2, $3)`,
        [finalId, tileIds[0], userId],
      ),
    ).rejects.toThrow(BLOCKED);
  });

  it("only blocks the account on the board that blocked it", async () => {
    const { userId } = await seedBlocked();
    const elsewhere = await seedBoard();

    await db.query(
      `insert into tiles (week_id, device_id, user_id, image_path)
       values ($1, $2, $3, 'tiles/elsewhere.webp')`,
      [elsewhere.weekId, elsewhere.artistDeviceId, userId],
    );
  });

  it("lets an unblocked account take part again", async () => {
    const { venueId, weekId, artistDeviceId, userId } = await seedBlocked();
    await db.query(
      `delete from venue_blocks where venue_id = $1 and user_id = $2`,
      [venueId, userId],
    );

    await db.query(
      `insert into tiles (week_id, device_id, user_id, image_path)
       values ($1, $2, $3, 'tiles/unblocked.webp')`,
      [weekId, artistDeviceId, userId],
    );
  });

  it("leaves guest tiles alone", async () => {
    const { weekId, artistDeviceId } = await seedBlocked();

    await db.query(
      `insert into tiles (week_id, device_id, image_path)
       values ($1, $2, 'tiles/guest.webp')`,
      [weekId, artistDeviceId],
    );
  });
});

describe("close_venue", () => {
  /** How many rows each table still holds for a venue. */
  async function leftFor(venueId: string, ownerId: string) {
    const result = await db.query<Record<string, number>>(
      `select
         (select count(*) from venues where id = $1)::int as venues,
         (select count(*) from owners where id = $2)::int as owners,
         (select count(*) from weeks where venue_id = $1)::int as weeks,
         (select count(*) from tiles t join weeks w on w.id = t.week_id
           where w.venue_id = $1)::int as tiles,
         (select count(*) from hall_of_fame where venue_id = $1)::int as hall_of_fame,
         (select count(*) from monthly_finals where venue_id = $1)::int as finals,
         (select count(*) from former_slugs where venue_id = $1)::int as former_slugs,
         (select count(*) from venue_blocks where venue_id = $1)::int as blocks,
         (select count(*) from daily_codes where venue_id = $1)::int as codes`,
      [venueId, ownerId],
    );
    return result.rows[0];
  }

  /** A board with a winner, a final, a former slug, a block and a code. */
  async function seedFullBoard() {
    const board = await seedBoard();
    const userId = crypto.randomUUID();
    await db.exec(`
      insert into auth.users (id, email) values ('${userId}', '${userId}@example.com');
      insert into profiles (id, username) values ('${userId}', 'Someone');
      update tiles set user_id = '${userId}' where id = '${board.tileIds[0]}';
      insert into hall_of_fame (venue_id, week_id, tile_id, vote_count)
        values ('${board.venueId}', '${board.weekId}', '${board.tileIds[0]}', 3);
      insert into monthly_finals (venue_id, month, starts_at, ends_at, winner_tile_id)
        values ('${board.venueId}', '2026-09-01', '2026-10-12T09:00:00Z',
                '2026-10-19T09:00:00Z', '${board.tileIds[0]}');
      insert into venue_blocks (venue_id, user_id) values ('${board.venueId}', '${userId}');
      insert into daily_codes (venue_id, code, valid_from, valid_until)
        values ('${board.venueId}', '${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}',
                '2026-09-08T09:00:00Z', '2026-09-09T09:00:00Z');
    `);
    await db.query(`select change_venue_slug($1, $2)`, [
      board.venueId,
      `${board.slug}-moved`,
    ]);
    return { ...board, userId };
  }

  it("deletes everything on the board, the Hall of Fame included", async () => {
    const { venueId, ownerId } = await seedFullBoard();
    expect(Object.values(await leftFor(venueId, ownerId))).not.toContain(0);

    await db.query(`select close_venue($1)`, [venueId]);

    expect(await leftFor(venueId, ownerId)).toEqual({
      venues: 0,
      owners: 0,
      weeks: 0,
      tiles: 0,
      hall_of_fame: 0,
      finals: 0,
      former_slugs: 0,
      blocks: 0,
      codes: 0,
    });
  });

  it("leaves every other board alone", async () => {
    const closing = await seedFullBoard();
    const other = await seedFullBoard();

    await db.query(`select close_venue($1)`, [closing.venueId]);

    expect(
      Object.values(await leftFor(other.venueId, other.ownerId)),
    ).not.toContain(0);
  });

  it("leaves the accounts that drew on it", async () => {
    const { venueId, userId } = await seedFullBoard();

    await db.query(`select close_venue($1)`, [venueId]);

    const result = await db.query(`select 1 from profiles where id = $1`, [
      userId,
    ]);
    expect(result.rows).toHaveLength(1);
  });

  it("frees the board's old slugs", async () => {
    const { venueId, slug } = await seedFullBoard();
    await db.query(`select close_venue($1)`, [venueId]);

    const ownerId = crypto.randomUUID();
    await db.exec(`
      insert into auth.users (id, email) values ('${ownerId}', '${ownerId}@example.com');
      insert into owners (id, email) values ('${ownerId}', '${ownerId}@example.com');
    `);
    await db.query(
      `insert into venues (owner_id, name, slug, timezone) values ($1, 'New', $2, 'UTC')`,
      [ownerId, slug],
    );
  });

  it("is for the server alone", async () => {
    const { venueId } = await seedBoard();

    await db.exec("set role authenticated");
    try {
      await expect(
        db.query(`select close_venue($1)`, [venueId]),
      ).rejects.toThrow(/permission denied/i);
    } finally {
      await db.exec("reset role");
    }
  });
});

describe("deleting an account", () => {
  /** An account with a weekly winner, a super winner, a plain tile and a report. */
  async function seedAccount() {
    const board = await seedBoard();
    const userId = crypto.randomUUID();
    const [weekly, superWinner, plain] = board.tileIds;
    await db.exec(`
      insert into auth.users (id, email) values ('${userId}', '${userId}@example.com');
      insert into profiles (id, username) values ('${userId}', 'Leaving');
      update tiles set user_id = '${userId}', display_name = 'Leaving', name_tag = '0042'
        where id in ('${weekly}', '${superWinner}', '${plain}');
      insert into hall_of_fame (venue_id, week_id, tile_id, vote_count)
        values ('${board.venueId}', '${board.weekId}', '${weekly}', 4);
      insert into monthly_finals (venue_id, month, starts_at, ends_at, winner_tile_id)
        values ('${board.venueId}', '2026-09-01', '2026-10-12T09:00:00Z',
                '2026-10-19T09:00:00Z', '${superWinner}');
      insert into tile_reports (tile_id, user_id, reason)
        values ('${board.tileIds[3]}', '${userId}', 'spam');
    `);
    return { ...board, userId, weekly, superWinner, plain };
  }

  async function deleteAccount(userId: string) {
    await db.query(`select delete_account_tiles($1)`, [userId]);
    await db.query(`delete from auth.users where id = $1`, [userId]);
  }

  it("lists the account's winning tiles", async () => {
    const { userId, weekly, superWinner } = await seedAccount();

    const result = await db.query<{ id: string }>(
      `select account_winning_tile_ids as id from account_winning_tile_ids($1)`,
      [userId],
    );
    expect(result.rows.map((row) => row.id).sort()).toEqual(
      [weekly, superWinner].sort(),
    );
  });

  it("deletes the account's other tiles", async () => {
    const { userId, plain } = await seedAccount();

    await deleteAccount(userId);

    const result = await db.query(`select 1 from tiles where id = $1`, [plain]);
    expect(result.rows).toEqual([]);
  });

  it("keeps its winners in the Hall of Fame, without a name", async () => {
    const { userId, weekly, superWinner } = await seedAccount();

    await deleteAccount(userId);

    const result = await db.query<{
      id: string;
      user_id: string | null;
      display_name: string | null;
      name_tag: string | null;
    }>(
      `select id, user_id, display_name, name_tag from tiles where id = any($1::uuid[]) order by id`,
      [[weekly, superWinner]],
    );
    expect(result.rows).toHaveLength(2);
    for (const row of result.rows) {
      expect(row).toMatchObject({
        user_id: null,
        display_name: null,
        name_tag: null,
      });
    }
    const hall = await db.query(
      `select 1 from hall_of_fame where tile_id = $1`,
      [weekly],
    );
    expect(hall.rows).toHaveLength(1);
  });

  it("takes the account's reports and profile with it", async () => {
    const { userId } = await seedAccount();

    await deleteAccount(userId);

    const left = await db.query<{ reports: number; profiles: number }>(
      `select (select count(*) from tile_reports where user_id = $1)::int as reports,
              (select count(*) from profiles where id = $1)::int as profiles`,
      [userId],
    );
    expect(left.rows[0]).toEqual({ reports: 0, profiles: 0 });
  });

  it("leaves other people's tiles alone", async () => {
    const { userId, tileIds } = await seedAccount();

    await deleteAccount(userId);

    const result = await db.query(`select 1 from tiles where id = $1`, [
      tileIds[3],
    ]);
    expect(result.rows).toHaveLength(1);
  });

  it("is for the server alone", async () => {
    const { userId } = await seedAccount();

    await db.exec("set role authenticated");
    try {
      await expect(
        db.query(`select delete_account_tiles($1)`, [userId]),
      ).rejects.toThrow(/permission denied/i);
    } finally {
      await db.exec("reset role");
    }
  });
});

describe("podiums", () => {
  /** A week with four account tiles and 3, 2, 1 and 0 votes on them. */
  async function seedVotedWeek() {
    const board = await seedBoard();
    const artistId = crypto.randomUUID();
    const voters = [
      crypto.randomUUID(),
      crypto.randomUUID(),
      crypto.randomUUID(),
    ];
    await db.exec(`
      insert into auth.users (id, email) values
        ('${artistId}', '${artistId}@example.com'),
        ${voters.map((id) => `('${id}', '${id}@example.com')`).join(", ")};
      insert into profiles (id, username) values
        ('${artistId}', 'Artist'),
        ${voters.map((id, i) => `('${id}', 'Voter${i}')`).join(", ")};
      update tiles set user_id = '${artistId}', display_name = 'Artist', name_tag = '0001'
        where week_id = '${board.weekId}' and device_id = '${board.artistDeviceId}';
      update weeks set posting_ends_at = now() - interval '1 day',
                       voting_ends_at = now() + interval '6 days'
        where id = '${board.weekId}';
    `);
    const [first, second, third] = board.tileIds;
    const ballots: [string, string][] = [
      [voters[0], first],
      [voters[1], first],
      [voters[2], first],
      [voters[0], second],
      [voters[1], second],
      [voters[0], third],
    ];
    for (const [userId, tileId] of ballots) {
      await db.query(
        `insert into votes (week_id, tile_id, user_id) values ($1, $2, $3)`,
        [board.weekId, tileId, userId],
      );
    }
    return { ...board, first, second, third };
  }

  const closeVoting = (weekId: string) =>
    db.query(
      `update weeks set voting_ends_at = now() - interval '1 minute' where id = $1`,
      [weekId],
    );

  it("shows nothing while the week is still being voted on", async () => {
    const { weekId } = await seedVotedWeek();

    const result = await db.query(`select * from week_podium($1)`, [weekId]);
    expect(result.rows).toEqual([]);
  });

  it("ranks the top three by votes once voting closes", async () => {
    const { weekId, first, second, third } = await seedVotedWeek();
    await closeVoting(weekId);

    const result = await db.query<{
      place: number;
      tile_id: string;
      votes: number;
    }>(`select place, tile_id, votes from week_podium($1)`, [weekId]);
    expect(result.rows).toEqual([
      { place: 1, tile_id: first, votes: 3 },
      { place: 2, tile_id: second, votes: 2 },
      { place: 3, tile_id: third, votes: 1 },
    ]);
  });

  it("agrees with the Hall of Fame on who won", async () => {
    const { weekId, first } = await seedVotedWeek();
    await closeVoting(weekId);

    await db.query(`select finalize_week_winner($1)`, [weekId]);
    const hall = await db.query<{ tile_id: string }>(
      `select tile_id from hall_of_fame where week_id = $1`,
      [weekId],
    );
    expect(hall.rows[0].tile_id).toBe(first);
  });

  it("leaves out a removed tile", async () => {
    const { weekId, first, second } = await seedVotedWeek();
    await closeVoting(weekId);
    await db.query(`update tiles set status = 'removed' where id = $1`, [
      first,
    ]);

    const result = await db.query<{ place: number; tile_id: string }>(
      `select place, tile_id from week_podium($1)`,
      [weekId],
    );
    expect(result.rows[0]).toEqual({ place: 1, tile_id: second });
  });

  it("orders a closed final's finalists, and hides an open one", async () => {
    const { venueId, weekId, tileIds } = await seedBoard();
    await db.query(
      `insert into hall_of_fame (venue_id, week_id, tile_id, vote_count) values ($1, $2, $3, 2)`,
      [venueId, weekId, tileIds[0]],
    );
    const finalId = crypto.randomUUID();
    await db.query(
      `insert into monthly_finals (id, venue_id, month, starts_at, ends_at)
       values ($1, $2, '2026-09-01', now() - interval '7 days', now() + interval '1 day')`,
      [finalId, venueId],
    );

    expect(
      (await db.query(`select * from final_podium($1)`, [finalId])).rows,
    ).toEqual([]);

    await db.query(
      `update monthly_finals set ends_at = now() - interval '1 minute' where id = $1`,
      [finalId],
    );
    const result = await db.query<{ place: number; tile_id: string }>(
      `select place, tile_id from final_podium($1)`,
      [finalId],
    );
    expect(result.rows).toEqual([{ place: 1, tile_id: tileIds[0] }]);
  });

  it("is for the server alone", async () => {
    const { weekId } = await seedBoard();

    await db.exec("set role anon");
    try {
      await expect(
        db.query(`select * from week_podium($1)`, [weekId]),
      ).rejects.toThrow(/permission denied/i);
    } finally {
      await db.exec("reset role");
    }
  });
});

describe("a crowned week", () => {
  /** A closed week: Artist's first tile has 2 votes, the second 1. */
  async function seedCrowned() {
    const board = await seedBoard();
    const artistId = crypto.randomUUID();
    const voters = [crypto.randomUUID(), crypto.randomUUID()];
    await db.exec(`
      insert into auth.users (id, email) values
        ('${artistId}', '${artistId}@example.com'),
        ${voters.map((id) => `('${id}', '${id}@example.com')`).join(", ")};
      insert into profiles (id, username) values
        ('${artistId}', 'Artist'),
        ${voters.map((id, i) => `('${id}', 'Voter${i}')`).join(", ")};
      update tiles set user_id = '${artistId}'
        where week_id = '${board.weekId}' and device_id = '${board.artistDeviceId}';
      update weeks set posting_ends_at = now() - interval '2 days',
                       voting_ends_at = now() + interval '1 day'
        where id = '${board.weekId}';
    `);
    const [winner, runnerUp, other] = board.tileIds;
    for (const [userId, tileId] of [
      [voters[0], winner],
      [voters[1], winner],
      [voters[0], runnerUp],
    ]) {
      await db.query(
        `insert into votes (week_id, tile_id, user_id) values ($1, $2, $3)`,
        [board.weekId, tileId, userId],
      );
    }
    await db.query(
      `update weeks set voting_ends_at = now() - interval '1 minute' where id = $1`,
      [board.weekId],
    );
    await db.query(`select finalize_week_winner($1)`, [board.weekId]);
    return { ...board, artistId, voters, winner, runnerUp, other };
  }

  async function crowned(weekId: string) {
    const result = await db.query<{ tile_id: string }>(
      `select tile_id from hall_of_fame where week_id = $1`,
      [weekId],
    );
    return result.rows[0]?.tile_id ?? null;
  }

  it("keeps its winner when the winner's account is deleted and the week is judged again", async () => {
    const { weekId, artistId, winner, other } = await seedCrowned();

    await db.query(`select delete_account_tiles($1)`, [artistId]);
    await db.query(`delete from auth.users where id = $1`, [artistId]);
    // Removing any other tile re-judges the week.
    await db.query(`update tiles set status = 'removed' where id = $1`, [
      other,
    ]);
    await db.query(`select finalize_week_winner($1)`, [weekId]);

    expect(await crowned(weekId)).toBe(winner);
  });

  it("keeps its winner when voters' accounts are deleted", async () => {
    const { weekId, voters, winner } = await seedCrowned();

    await db.query(`delete from auth.users where id = $1`, [voters[1]]);
    await db.query(`select finalize_week_winner($1)`, [weekId]);

    expect(await crowned(weekId)).toBe(winner);
  });

  it("is re-crowned from what's left when its winner is removed", async () => {
    const { weekId, winner, runnerUp } = await seedCrowned();

    await db.query(`update tiles set status = 'removed' where id = $1`, [
      winner,
    ]);
    await db.query(`select finalize_week_winner($1)`, [weekId]);

    expect(await crowned(weekId)).toBe(runnerUp);
  });
});
