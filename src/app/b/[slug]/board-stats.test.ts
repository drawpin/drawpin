import { describe, expect, it } from "vitest";
import { boardStatsSummary } from "./board-stats";

describe("boardStatsSummary", () => {
  it("lists people, total drawings and this week's count", () => {
    expect(
      boardStatsSummary({ people: 24, totalDrawings: 58, weekDrawings: 12 }),
    ).toBe("24 artists · 58 drawings · 12 this week");
  });

  it("uses singular nouns for a count of one", () => {
    expect(
      boardStatsSummary({ people: 1, totalDrawings: 1, weekDrawings: 1 }),
    ).toBe("1 artist · 1 drawing · 1 this week");
  });

  it("is null for a board nobody has drawn on", () => {
    expect(
      boardStatsSummary({ people: 0, totalDrawings: 0, weekDrawings: 0 }),
    ).toBeNull();
  });
});
