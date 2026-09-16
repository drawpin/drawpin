import { describe, expect, it } from "vitest";
import { createBoardSlug, slugifyVenueName } from "./slug";

// Mirrors the venues.slug check constraint in the initial migration.
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe("slugifyVenueName", () => {
  it("lowercases and hyphenates words", () => {
    expect(slugifyVenueName("Blue Bottle Coffee")).toBe("blue-bottle-coffee");
  });

  it("strips accents and punctuation", () => {
    expect(slugifyVenueName("Café Olé & Co.")).toBe("cafe-ole-co");
  });

  it("collapses repeated separators and trims the ends", () => {
    expect(slugifyVenueName("  --Joe's   Diner--  ")).toBe("joe-s-diner");
  });

  it("caps the length without leaving a trailing hyphen", () => {
    const slug = slugifyVenueName(`${"a".repeat(39)} bcd`);
    expect(slug).toBe("a".repeat(39));
  });

  it("falls back when nothing usable is left", () => {
    expect(slugifyVenueName("☕☕☕")).toBe("board");
  });
});

describe("createBoardSlug", () => {
  it("appends a 4-character suffix", () => {
    const slug = createBoardSlug("Blue Bottle", (bytes) => bytes.fill(0));
    expect(slug).toBe("blue-bottle-aaaa");
  });

  it("never uses easily misread characters in the suffix", () => {
    for (let i = 0; i < 200; i++) {
      const suffix = createBoardSlug("x").split("-").at(-1);
      expect(suffix).toMatch(/^[a-hjkmnp-z2-9]{4}$/);
    }
  });

  it("always satisfies the database slug constraint", () => {
    for (const name of ["Blue Bottle", "Café Olé", "☕", "a".repeat(120)]) {
      expect(createBoardSlug(name)).toMatch(SLUG_PATTERN);
    }
  });
});
