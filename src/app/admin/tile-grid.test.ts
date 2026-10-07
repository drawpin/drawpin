import { describe, expect, it } from "vitest";
import { columnCount, visibleRowsHeight } from "./tile-grid";

describe("columnCount", () => {
  it("counts the tracks of a computed grid", () => {
    expect(columnCount("150px 150px")).toBe(2);
    expect(columnCount("180.5px 180.5px 180.5px")).toBe(3);
  });

  it("treats no grid as one column", () => {
    expect(columnCount("none")).toBe(1);
    expect(columnCount("")).toBe(1);
  });
});

describe("visibleRowsHeight", () => {
  // Two columns, rows starting at 0, 200 and 400.
  const tops = [0, 0, 200, 200, 400];

  it("shows two rows and a sliver of the third", () => {
    expect(visibleRowsHeight(tops, 2, 2, 24)).toBe(424);
  });

  it("is null when there's no third row", () => {
    expect(visibleRowsHeight(tops.slice(0, 4), 2, 2, 24)).toBeNull();
    expect(visibleRowsHeight(tops.slice(0, 5), 3, 2, 24)).toBeNull();
  });
});
