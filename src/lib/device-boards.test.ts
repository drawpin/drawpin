import { describe, expect, it } from "vitest";
import {
  forgetDeviceBoard,
  parseDeviceBoards,
  rememberDeviceBoard,
  serializeDeviceBoards,
} from "./device-boards";
import { MAX_LISTED_BOARDS } from "./my-boards";

const at = (iso: string) => new Date(iso);

describe("device boards cookie", () => {
  it("round-trips slugs and times, newest first, to the second", () => {
    const boards = [
      { slug: "book-club-p9qa", lastVisitedAt: at("2026-10-01T08:00:00Z") },
      { slug: "maple-street-k7m2", lastVisitedAt: at("2026-11-02T09:30:15Z") },
    ];

    const value = serializeDeviceBoards(boards);

    expect(value).toMatch(/^v1\.maple-street-k7m2~[0-9a-z]+\.book-club-p9qa~/);
    expect(parseDeviceBoards(value)).toEqual([boards[1], boards[0]]);
  });

  it("uses only cookie-safe characters", () => {
    const value = serializeDeviceBoards([
      { slug: "a-b-c", lastVisitedAt: at("2026-11-02T00:00:00Z") },
    ]);

    expect(value).toMatch(/^[a-z0-9.~-]+$/);
    expect(encodeURIComponent(value)).toBe(value);
  });

  it.each([
    [undefined],
    [""],
    ["v2.board-1~t2xk3c"],
    ["board-1~t2xk3c"],
    ["%7B%22not%22%3A%22ours%22%7D"],
  ])("reads %j as no boards", (value) => {
    expect(parseDeviceBoards(value)).toEqual([]);
  });

  it("drops bad entries and keeps the good ones", () => {
    const good = serializeDeviceBoards([
      { slug: "good-board", lastVisitedAt: at("2026-11-02T00:00:00Z") },
    ]);

    const parsed = parseDeviceBoards(
      `${good}.Bad Slug~t2xk3c.no-time.too~many~parts.bad-time~!!.good-board~1`,
    );

    expect(parsed.map((board) => board.slug)).toEqual(["good-board"]);
  });

  it(`keeps no more than ${MAX_LISTED_BOARDS}`, () => {
    const boards = Array.from({ length: 30 }, (_, i) => ({
      slug: `board-${i}`,
      lastVisitedAt: at(`2026-10-${String(i + 1).padStart(2, "0")}T00:00:00Z`),
    }));

    const parsed = parseDeviceBoards(serializeDeviceBoards(boards));

    expect(parsed).toHaveLength(MAX_LISTED_BOARDS);
    expect(parsed[0].slug).toBe("board-29");
  });

  it("moves a board opened again to the front", () => {
    let value = rememberDeviceBoard(
      undefined,
      "one",
      at("2026-11-01T00:00:00Z"),
    );
    value = rememberDeviceBoard(value, "two", at("2026-11-01T01:00:00Z"));
    value = rememberDeviceBoard(value, "one", at("2026-11-01T02:00:00Z"));

    expect(parseDeviceBoards(value)).toEqual([
      { slug: "one", lastVisitedAt: at("2026-11-01T02:00:00Z") },
      { slug: "two", lastVisitedAt: at("2026-11-01T01:00:00Z") },
    ]);
  });

  it("forgets a board", () => {
    const value = rememberDeviceBoard(
      rememberDeviceBoard(undefined, "one"),
      "two",
    );

    expect(
      parseDeviceBoards(forgetDeviceBoard(value, "one")).map((b) => b.slug),
    ).toEqual(["two"]);
  });

  it("holds nothing but slugs and times", () => {
    const value = rememberDeviceBoard(
      undefined,
      "one",
      at("2026-11-01T00:00:00Z"),
    );

    expect(value.split(".").slice(1)).toEqual([
      `one~${(Date.parse("2026-11-01T00:00:00Z") / 1000).toString(36)}`,
    ]);
  });
});
