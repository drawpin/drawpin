import { describe, expect, it } from "vitest";
import {
  formatAuthor,
  liveTileRowSchema,
  mergeTiles,
  olderThanCursorFilter,
  type Tile,
  tileCursorSchema,
  toTile,
} from "./tiles";

const tile = (id: string, caption: string | null = null): Tile => ({
  id,
  author: null,
  isGuest: true,
  caption,
  imageUrl: `https://cdn.example/${id}.webp`,
  createdAt: "2026-09-16T21:30:00.123456+00:00",
});

describe("mergeTiles", () => {
  it("keeps list order and drops later duplicates", () => {
    const merged = mergeTiles(
      [tile("new")],
      [tile("new", "server copy"), tile("a"), tile("b")],
      [tile("a"), tile("b"), tile("c")],
    );

    expect(merged.map((t) => t.id)).toEqual(["new", "a", "b", "c"]);
    expect(merged[0].caption).toBeNull();
  });

  it("keeps a tile that dropped off a refreshed first page", () => {
    // On screen: a..c. After a refresh the server's first page gained "new" and
    // lost "c"; "c" must stay visible above the next "Load more" page.
    const onScreen = [tile("a"), tile("b"), tile("c")];
    const refreshedPage = [tile("new"), tile("a"), tile("b")];

    expect(mergeTiles(refreshedPage, onScreen).map((t) => t.id)).toEqual([
      "new",
      "a",
      "b",
      "c",
    ]);
  });
});

describe("liveTileRowSchema", () => {
  const row = {
    id: "0b6f3f0e-2a8e-4b1a-9f55-4d9f0f6f2c11",
    week_id: "5d1c0b8e-6a3f-4c2e-8f1d-2b7a9c4e6f10",
    device_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    user_id: null,
    display_name: "Ahmad",
    name_tag: "4821",
    caption: null,
    image_path: "venue/week/tile.webp",
    created_at: "2026-09-16T21:30:00.123456+00:00",
    status: "live",
  };

  it("accepts a live tile row", () => {
    expect(liveTileRowSchema.safeParse(row).success).toBe(true);
  });

  it("rejects removed tiles and malformed rows", () => {
    expect(
      liveTileRowSchema.safeParse({ ...row, status: "removed" }).success,
    ).toBe(false);
    expect(
      liveTileRowSchema.safeParse({ ...row, image_path: "" }).success,
    ).toBe(false);
    expect(liveTileRowSchema.safeParse({}).success).toBe(false);
  });
});

describe("formatAuthor", () => {
  it("joins the username and tag", () => {
    expect(formatAuthor("Ahmad", "4821")).toBe("Ahmad#4821");
  });

  it("returns null for an anonymous tile", () => {
    expect(formatAuthor(null, null)).toBeNull();
  });
});

describe("toTile", () => {
  it("maps a row and resolves the image URL", () => {
    const tile = toTile(
      {
        id: "0b6f3f0e-2a8e-4b1a-9f55-4d9f0f6f2c11",
        user_id: null,
        display_name: "Ahmad",
        name_tag: "4821",
        caption: "hello",
        image_path: "venue/week/tile.webp",
        created_at: "2026-09-16T21:30:00.123456+00:00",
      },
      (path) => `https://cdn.example/${path}`,
    );

    expect(tile).toEqual({
      isGuest: true,
      id: "0b6f3f0e-2a8e-4b1a-9f55-4d9f0f6f2c11",
      author: "Ahmad#4821",
      caption: "hello",
      imageUrl: "https://cdn.example/venue/week/tile.webp",
      createdAt: "2026-09-16T21:30:00.123456+00:00",
    });
  });
});

describe("tileCursorSchema", () => {
  it("accepts a Postgres timestamp with microseconds and an offset", () => {
    expect(
      tileCursorSchema.safeParse({
        createdAt: "2026-09-16T21:30:00.123456+00:00",
        id: "0b6f3f0e-2a8e-4b1a-9f55-4d9f0f6f2c11",
      }).success,
    ).toBe(true);
  });

  it.each([
    { createdAt: "yesterday", id: "0b6f3f0e-2a8e-4b1a-9f55-4d9f0f6f2c11" },
    { createdAt: "2026-09-16T21:30:00Z", id: "not-a-uuid" },
    // Filter injection attempt: must never reach the PostgREST `or` string.
    {
      createdAt: '2026-09-16T21:30:00Z",status.eq.removed',
      id: "0b6f3f0e-2a8e-4b1a-9f55-4d9f0f6f2c11",
    },
  ])("rejects %j", (cursor) => {
    expect(tileCursorSchema.safeParse(cursor).success).toBe(false);
  });
});

describe("olderThanCursorFilter", () => {
  it("orders by created_at, then id for ties", () => {
    expect(
      olderThanCursorFilter({
        createdAt: "2026-09-16T21:30:00.123456+00:00",
        id: "0b6f3f0e-2a8e-4b1a-9f55-4d9f0f6f2c11",
      }),
    ).toBe(
      'created_at.lt."2026-09-16T21:30:00.123456+00:00",and(created_at.eq."2026-09-16T21:30:00.123456+00:00",id.lt.0b6f3f0e-2a8e-4b1a-9f55-4d9f0f6f2c11)',
    );
  });
});

describe("guest tiles", () => {
  const row = {
    id: "0b6f3f0e-2a8e-4b1a-9f55-4d9f0f6f2c11",
    user_id: null as string | null,
    display_name: "Ahmad",
    name_tag: "4821",
    caption: null,
    image_path: "venue/week/tile.webp",
    created_at: "2026-09-16T21:30:00.123456+00:00",
  };
  const url = (path: string) => `https://cdn.example/${path}`;

  it("marks a tile posted without an account", () => {
    expect(toTile(row, url).isGuest).toBe(true);
  });

  it("doesn't mark one posted by an account", () => {
    const signedIn = {
      ...row,
      user_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    };

    expect(toTile(signedIn, url).isGuest).toBe(false);
  });
});
