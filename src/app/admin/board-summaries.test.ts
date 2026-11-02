import { describe, expect, it } from "vitest";
import { boardsLeft, drawingsLine, startCardLine } from "./board-summaries";

describe("boardsLeft", () => {
  it("counts the boards still to start", () => {
    expect(boardsLeft(2)).toBe(3);
    expect(boardsLeft(5)).toBe(0);
  });

  it("never goes below zero", () => {
    expect(boardsLeft(7)).toBe(0);
  });
});

describe("drawingsLine", () => {
  it("pluralises", () => {
    expect(drawingsLine(0)).toBe("0 drawings this week");
    expect(drawingsLine(1)).toBe("1 drawing this week");
    expect(drawingsLine(14)).toBe("14 drawings this week");
  });
});

describe("startCardLine", () => {
  it("says how many more boards fit", () => {
    expect(startCardLine(2)).toBe(
      "Name it, pick its time zone, print the code. You can run 3 more.",
    );
  });
});
