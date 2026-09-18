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

  const publicTables = ["venues", "weeks", "tiles", "hall_of_fame", "profiles"];
  const ownerTables = ["owners", "daily_codes"];
  const privateTables = [
    "devices",
    "votes",
    "post_attempts",
    "code_attempts",
    "account_posts",
  ];
  const allTables = [...publicTables, ...ownerTables, ...privateTables];

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
