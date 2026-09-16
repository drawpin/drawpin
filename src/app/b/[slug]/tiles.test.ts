import { describe, expect, it } from "vitest";
import {
  formatAuthor,
  olderThanCursorFilter,
  tileCursorSchema,
  toTile,
} from "./tiles";

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
        display_name: "Ahmad",
        name_tag: "4821",
        caption: "hello",
        image_path: "venue/week/tile.webp",
        created_at: "2026-09-16T21:30:00.123456+00:00",
      },
      (path) => `https://cdn.example/${path}`,
    );

    expect(tile).toEqual({
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
