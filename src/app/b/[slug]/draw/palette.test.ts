// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  BASE_COLORS,
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
