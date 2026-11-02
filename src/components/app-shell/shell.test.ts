import { describe, expect, it } from "vitest";
import { boardSlugFromPath, chromeForPath } from "./chrome";
import { boardActionSchema, undoRemoveSchema, visitSchema } from "./schema";

describe("chromeForPath", () => {
  it.each([
    ["/", "full"],
    ["/b/maple-street", "full"],
    ["/b/maple-street/vote", "full"],
    ["/b/maple-street/draw", "button-only"],
    ["/admin/maple-street", "full"],
    ["/admin/print", "none"],
    ["/admin/maple-street/print", "none"],
  ])("%s gets %s", (path, chrome) => {
    expect(chromeForPath(path)).toBe(chrome);
  });
});

describe("boardSlugFromPath", () => {
  it.each([
    ["/b/maple-street", "maple-street"],
    ["/b/maple-street/hall-of-fame", "maple-street"],
    ["/", null],
    ["/admin/maple-street", null],
    ["/b/%E0%A4%A", null],
  ])("%s is on %j", (path, slug) => {
    expect(boardSlugFromPath(path)).toBe(slug);
  });
});

const VENUE = "00000000-0000-4000-8000-000000000001";

describe("sidebar action input", () => {
  it("takes a board slug to visit, and nothing else", () => {
    expect(visitSchema.safeParse({ slug: "maple-street" }).success).toBe(true);
    expect(visitSchema.safeParse({ slug: "Maple Street" }).success).toBe(false);
    expect(visitSchema.safeParse({ slug: "../admin" }).success).toBe(false);
    expect(visitSchema.safeParse("maple-street").success).toBe(false);
  });

  it("takes a board id to pin, unpin or remove", () => {
    expect(boardActionSchema.safeParse({ venueId: VENUE }).success).toBe(true);
    expect(boardActionSchema.safeParse({ venueId: "1" }).success).toBe(false);
    expect(boardActionSchema.safeParse({}).success).toBe(false);
  });

  it("takes the removed row back as it was, timestamps and all", () => {
    const row = {
      venueId: VENUE,
      slug: "maple-street",
      lastVisitedAt: "2026-11-02T09:30:00.123+00:00",
      pinnedAt: null,
    };
    expect(undoRemoveSchema.safeParse(row).success).toBe(true);
    expect(
      undoRemoveSchema.safeParse({
        ...row,
        pinnedAt: "2026-11-02T09:30:00.000Z",
      }).success,
    ).toBe(true);
    expect(
      undoRemoveSchema.safeParse({ ...row, lastVisitedAt: "yesterday" })
        .success,
    ).toBe(false);
  });
});
