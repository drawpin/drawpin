import { describe, expect, it } from "vitest";
import { boardStatsSummary, toBoardStats } from "./stats";

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

describe("toBoardStats", () => {
  it("turns the database's bigint counts into numbers", () => {
    expect(
      toBoardStats({ people: "3", total_drawings: "7", week_drawings: "2" }),
    ).toEqual({ people: 3, totalDrawings: 7, weekDrawings: 2 });
  });

  it("accepts counts that already arrive as numbers", () => {
    expect(
      toBoardStats({ people: 3, total_drawings: 7, week_drawings: 2 }),
    ).toEqual({ people: 3, totalDrawings: 7, weekDrawings: 2 });
  });
});
