// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  BASE_COLORS,
  hexToRgb,
  parseHexInput,
  parseRecents,
  RECENT_LIMIT,
  rgbToHex,
  withRecent,
} from "./palette";

describe("BASE_COLORS", () => {
  it("offers six, white among them", () => {
    expect(BASE_COLORS).toHaveLength(6);
    expect(BASE_COLORS.map((color) => color.value)).toContain("#ffffff");
  });

  it("starts with black, the default brush colour", () => {
    expect(BASE_COLORS[0].name).toBe("Black");
  });
});

describe("parseHexInput", () => {
  it("returns a colour once six digits are in", () => {
    expect(parseHexInput("ff8800")).toEqual({
      draft: "ff8800",
      color: "#ff8800",
    });
  });

  it("accepts a pasted value with its #, in any case", () => {
    expect(parseHexInput("#FF8800").color).toBe("#ff8800");
  });

  it("keeps a half-typed value as a draft without making it a colour", () => {
    expect(parseHexInput("ff8")).toEqual({ draft: "ff8", color: null });
  });

  it("drops anything that isn't a hex digit", () => {
    expect(parseHexInput("zz12 34gg56").draft).toBe("123456");
  });

  it("stops at six digits", () => {
    expect(parseHexInput("1234567890").draft).toBe("123456");
  });
});

describe("withRecent", () => {
  it("puts the newest first", () => {
    expect(withRecent(["#ef4444"], "#3b82f6")).toEqual(["#3b82f6", "#ef4444"]);
  });

  it("moves a colour already used rather than repeating it", () => {
    const recents = withRecent(["#3b82f6", "#ef4444"], "#ef4444");

    expect(recents).toEqual(["#ef4444", "#3b82f6"]);
  });

  it("keeps the row short", () => {
    let recents: string[] = [];
    for (let i = 0; i < 20; i++) {
      recents = withRecent(recents, `#0000${i.toString(16).padStart(2, "0")}`);
    }

    expect(recents).toHaveLength(RECENT_LIMIT);
  });

  it("drops the colour used longest ago, not the one added first", () => {
    const full = ["#000005", "#000004", "#000003", "#000002", "#000001"];
    expect(full).toHaveLength(RECENT_LIMIT);

    // Re-pick the oldest, then overflow the row by one.
    const revived = withRecent(full, "#000001");
    const after = withRecent(revived, "#0000ff");

    expect(after).toEqual([
      "#0000ff",
      "#000001",
      "#000005",
      "#000004",
      "#000003",
    ]);
    // #000002 went, because nothing had been used longer ago than it.
    expect(after).not.toContain("#000002");
  });
});

describe("parseRecents", () => {
  it("reads a stored row", () => {
    expect(parseRecents('["#ef4444","#3b82f6"]')).toEqual([
      "#ef4444",
      "#3b82f6",
    ]);
  });

  it.each([null, "", "not json", '"a string"', "[1,2,3]", '["red"]'])(
    "ignores %o rather than breaking the palette",
    (stored) => {
      expect(parseRecents(stored)).toEqual([]);
    },
  );
});

describe("hexToRgb / rgbToHex", () => {
  it("splits a colour into red, green and blue", () => {
    expect(hexToRgb("#ef4444")).toEqual([239, 68, 68]);
  });

  it("puts them back together", () => {
    expect(rgbToHex([239, 68, 68])).toBe("#ef4444");
  });

  it("keeps a box that's out of range to a real colour", () => {
    expect(rgbToHex([300, -5, 12.6])).toBe("#ff000d");
  });

  it("treats an empty box as zero", () => {
    expect(rgbToHex([Number.NaN, 0, 0])).toBe("#000000");
  });
});
