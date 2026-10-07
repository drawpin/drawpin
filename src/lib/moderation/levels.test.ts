import { describe, expect, it } from "vitest";
import {
  DEFAULT_MODERATION_LEVEL,
  MODERATION_LEVEL_INFO,
  MODERATION_LEVELS,
  toModerationLevel,
} from "./levels";
import { policyFor } from "./policy";

describe("toModerationLevel", () => {
  it.each(MODERATION_LEVELS)("reads %s as itself", (level) => {
    expect(toModerationLevel(level)).toBe(level);
  });

  it.each([null, undefined, "", "LATE_NIGHT", "none", 3])(
    "reads %j as All Ages, so a bad value moderates more",
    (value) => {
      expect(toModerationLevel(value)).toBe("all_ages");
    },
  );
});

describe("MODERATION_LEVELS", () => {
  it("offers All Ages first, as the default", () => {
    expect(MODERATION_LEVELS[0]).toBe(DEFAULT_MODERATION_LEVEL);
    expect(DEFAULT_MODERATION_LEVEL).toBe("all_ages");
  });

  it("tells the owner that Late Night still blocks the legal floor", () => {
    expect(MODERATION_LEVEL_INFO.late_night.forOwner).toMatch(
      /sexual content involving minors is always blocked/,
    );
  });
});

describe("what visitors are told", () => {
  // The rules page lists what's blocked; it must match what policy.ts blocks.
  const told = {
    language: "Swearing",
    violent: "Violence, gore and self-harm",
    sexual: "Nudity and sexual content",
    hateful: "Slurs, hate symbols and harassment",
    contact: "Links, email addresses and phone numbers",
  } as const;

  it.each(MODERATION_LEVELS)("lists what %s blocks, and only that", (level) => {
    const { blocks } = policyFor(level);
    for (const [category, line] of Object.entries(told)) {
      expect(MODERATION_LEVEL_INFO[level].blocked.includes(line)).toBe(
        blocks.has(category as keyof typeof told),
      );
    }
  });

  it.each(MODERATION_LEVELS)("names the legal floor on %s", (level) => {
    expect(MODERATION_LEVEL_INFO[level].blocked.at(-1)).toMatch(
      /Sexual content involving minors/,
    );
  });

  it("adds a draw-screen note only where more than All Ages is allowed", () => {
    expect(MODERATION_LEVEL_INFO.all_ages.drawNote).toBeNull();
    expect(MODERATION_LEVEL_INFO.standard.drawNote).toBeTruthy();
    expect(MODERATION_LEVEL_INFO.late_night.drawNote).toBeTruthy();
  });
});
