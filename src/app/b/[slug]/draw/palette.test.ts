// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  BASE_COLORS,
  parseHexInput,
  parseRecents,
  RECENT_LIMIT,
  shadesOf,
  withRecent,
} from "./palette";

/** Rough perceived brightness, for comparing one shade against another. */
function brightness(hex: string): number {
  const value = Number.parseInt(hex.slice(1), 16);
  return (
    0.299 * ((value >> 16) & 255) +
    0.587 * ((value >> 8) & 255) +
    0.114 * (value & 255)
  );
}

describe("shadesOf", () => {
  it("gives five, darkest first, with the colour itself in the middle", () => {
    const shades = shadesOf("#3b82f6");

    expect(shades).toHaveLength(5);
    expect(shades[2]).toBe("#3b82f6");
  });

  it("gets lighter across the row", () => {
    const shades = shadesOf("#ef4444").map(brightness);

    for (let i = 1; i < shades.length; i++) {
      expect(shades[i]).toBeGreaterThan(shades[i - 1]);
    }
  });

  it("keeps a colour recognisably itself", () => {
    // A lighter red should still be reddest of its three channels.
    const lightest = shadesOf("#ef4444").at(-1)!;
    const value = Number.parseInt(lightest.slice(1), 16);

    expect((value >> 16) & 255).toBeGreaterThan((value >> 8) & 255);
    expect((value >> 16) & 255).toBeGreaterThan(value & 255);
  });

  it("produces five distinct colours for every base in the palette", () => {
    for (const base of BASE_COLORS) {
      expect(new Set(shadesOf(base.value)).size).toBe(5);
    }
  });

  it("always returns usable hex", () => {
    for (const shade of shadesOf("#ffffff")) {
      expect(shade).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("gives white a row of greys instead of white three times", () => {
    const shades = shadesOf("#ffffff");

    expect(shades).toEqual([
      "#333333",
      "#666666",
      "#999999",
      "#cccccc",
      "#ffffff",
    ]);
  });

  it("treats an uppercase colour the same as a lowercase one", () => {
    expect(shadesOf("#FFFFFF")).toEqual(shadesOf("#ffffff"));
    expect(shadesOf("#3B82F6")[2]).toBe("#3b82f6");
  });
});

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
