// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { BlockedTerm } from "./blocklist";
import {
  blockedTermsFor,
  blocksOpenAiCategory,
  type ModerationLevel,
  policyFor,
} from "./policy";

const LEVELS: ModerationLevel[] = ["all_ages", "standard", "late_night"];

describe("policyFor", () => {
  // ADR-012's table, one row per kind of content.
  it.each([
    ["language", true, false, false],
    ["violent", true, false, false],
    ["sexual", true, true, false],
    ["hateful", true, true, false],
    ["contact", true, true, false],
  ] as const)(
    "blocks %s on all_ages: %s, standard: %s, late_night: %s",
    (category, allAges, standard, lateNight) => {
      expect(policyFor("all_ages").blocks.has(category)).toBe(allAges);
      expect(policyFor("standard").blocks.has(category)).toBe(standard);
      expect(policyFor("late_night").blocks.has(category)).toBe(lateNight);
    },
  );

  it("uses the site-wide extra terms everywhere but late_night", () => {
    expect(policyFor("all_ages").extraTerms).toBe(true);
    expect(policyFor("standard").extraTerms).toBe(true);
    expect(policyFor("late_night").extraTerms).toBe(false);
  });

  it("reads the drawing everywhere but late_night", () => {
    expect(policyFor("all_ages").readsDrawing).toBe(true);
    expect(policyFor("standard").readsDrawing).toBe(true);
    expect(policyFor("late_night").readsDrawing).toBe(false);
  });
});

describe("blocksOpenAiCategory", () => {
  it.each(LEVELS)("blocks sexual/minors on %s", (level) => {
    expect(blocksOpenAiCategory(policyFor(level), "sexual/minors")).toBe(true);
  });

  it.each([
    ["hate", true, true, false],
    ["harassment/threatening", true, true, false],
    ["sexual", true, true, false],
    ["violence/graphic", true, false, false],
    ["self-harm/intent", true, false, false],
    ["illicit", true, false, false],
    // A category OpenAI adds later reads as language.
    ["something-new", true, false, false],
  ] as const)(
    "blocks %s on all_ages: %s, standard: %s, late_night: %s",
    (category, allAges, standard, lateNight) => {
      expect(blocksOpenAiCategory(policyFor("all_ages"), category)).toBe(
        allAges,
      );
      expect(blocksOpenAiCategory(policyFor("standard"), category)).toBe(
        standard,
      );
      expect(blocksOpenAiCategory(policyFor("late_night"), category)).toBe(
        lateNight,
      );
    },
  );
});

describe("blockedTermsFor", () => {
  const profanity: BlockedTerm[] = [
    { term: "zzslur", category: "hateful" },
    { term: "zzlewd", category: "sexual" },
    { term: "zzswear", category: "language" },
    { term: "zzuntagged" },
    "zzplain",
  ];
  const extra = ["zzextra"];
  const terms = (level: ModerationLevel) =>
    blockedTermsFor(policyFor(level), profanity, extra).map((term) =>
      typeof term === "string" ? term : term.term,
    );

  it("keeps every term on all_ages, in order", () => {
    expect(terms("all_ages")).toEqual([
      "zzslur",
      "zzlewd",
      "zzswear",
      "zzuntagged",
      "zzplain",
      "zzextra",
    ]);
  });

  it("drops swearing on standard, keeping slurs, sexual and extra terms", () => {
    expect(terms("standard")).toEqual(["zzslur", "zzlewd", "zzextra"]);
  });

  it("drops every term on late_night", () => {
    expect(terms("late_night")).toEqual([]);
  });
});
