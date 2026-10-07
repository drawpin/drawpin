import { describe, expect, it, vi } from "vitest";
import {
  changeModerationLevel,
  moderationLevelFormSchema,
  type UpdateModerationLevel,
} from "./change-moderation-level";

describe("moderationLevelFormSchema", () => {
  it.each(["all_ages", "standard", "late_night"])("accepts %s", (level) => {
    expect(moderationLevelFormSchema.parse({ moderationLevel: level })).toEqual(
      { moderationLevel: level },
    );
  });

  it.each([null, "", "none", "All Ages"])("refuses %j", (moderationLevel) => {
    const result = moderationLevelFormSchema.safeParse({ moderationLevel });
    expect(result.error?.issues[0].message).toBe(
      "Pick the rules for your board.",
    );
  });
});

describe("changeModerationLevel", () => {
  it("writes the new level", async () => {
    const update = vi.fn<UpdateModerationLevel>().mockResolvedValue({
      error: null,
    });

    await expect(
      changeModerationLevel("all_ages", "late_night", update),
    ).resolves.toBe("changed");
    expect(update).toHaveBeenCalledWith("late_night");
  });

  it("skips the write when the level is already set", async () => {
    const update = vi.fn<UpdateModerationLevel>();

    await expect(
      changeModerationLevel("standard", "standard", update),
    ).resolves.toBe("unchanged");
    expect(update).not.toHaveBeenCalled();
  });

  it("throws on a database error", async () => {
    const update = vi.fn<UpdateModerationLevel>().mockResolvedValue({
      error: { message: "violates check constraint" },
    });

    await expect(
      changeModerationLevel("all_ages", "standard", update),
    ).rejects.toThrow("violates check constraint");
  });
});
