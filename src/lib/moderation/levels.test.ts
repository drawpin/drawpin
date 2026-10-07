import { describe, expect, it } from "vitest";
import {
  DEFAULT_MODERATION_LEVEL,
  MODERATION_LEVEL_INFO,
  MODERATION_LEVELS,
  toModerationLevel,
} from "./levels";

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
