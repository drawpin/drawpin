import { describe, expect, it } from "vitest";
import {
  type AdminTile,
  combineDrawings,
  type ReportedTile,
  reportLine,
} from "./drawings";

const tile = (id: string): AdminTile => ({
  id,
  author: `Sam#${id.padStart(4, "0")}`,
  canBlock: true,
  caption: null,
  imageUrl: `https://example.test/${id}.png`,
});

const reported = (id: string, reportCount: number): ReportedTile => ({
  ...tile(id),
  reportCount,
  reasons: ["spam"],
});

describe("combineDrawings", () => {
  it("marks this week's reported drawings and leaves the rest alone", () => {
    const { all } = combineDrawings([tile("1"), tile("2")], [reported("2", 3)]);
    expect(all.map((drawing) => drawing.reports)).toEqual([
      undefined,
      { count: 3, reasons: ["spam"] },
    ]);
  });

  it("keeps every reported drawing, in the order given, flagging earlier weeks'", () => {
    const { all, reported: shown } = combineDrawings(
      [tile("1"), tile("2")],
      [reported("9", 4), reported("2", 1)],
    );
    expect(shown.map((drawing) => [drawing.id, drawing.earlier])).toEqual([
      ["9", true],
      ["2", undefined],
    ]);
    // An earlier week's drawing shows only among the reported ones.
    expect(all.map((drawing) => drawing.id)).toEqual(["1", "2"]);
  });

  it("has nothing reported when there are no reports", () => {
    expect(combineDrawings([tile("1")], []).reported).toEqual([]);
  });
});

describe("reportLine", () => {
  it("counts the reports and says why, in words", () => {
    expect(reportLine({ count: 1, reasons: ["offensive"] })).toBe(
      "1 report: hateful or offensive",
    );
    expect(reportLine({ count: 2, reasons: ["spam", "other"] })).toBe(
      "2 reports: spam, something else",
    );
  });
});
