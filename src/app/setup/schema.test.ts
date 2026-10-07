import { describe, expect, it } from "vitest";
import { setupSchema } from "./schema";

describe("setupSchema", () => {
  it("accepts a name and an IANA time zone", () => {
    expect(
      setupSchema.parse({
        name: "  Blue Bottle ",
        timezone: "America/Chicago",
        moderationLevel: "all_ages",
      }),
    ).toEqual({
      name: "Blue Bottle",
      timezone: "America/Chicago",
      moderationLevel: "all_ages",
    });
  });

  it("requires a name", () => {
    const result = setupSchema.safeParse({
      name: "   ",
      timezone: "Europe/Paris",
    });
    expect(result.error?.issues[0].message).toBe(
      "Enter a name for your board.",
    );
  });

  it("caps the name at 120 characters", () => {
    const result = setupSchema.safeParse({
      name: "a".repeat(121),
      timezone: "Europe/Paris",
    });
    expect(result.success).toBe(false);
  });

  it.each(["", "Mars/Olympus_Mons", "+05:00", "america/chicago"])(
    "rejects %j as a time zone",
    (timezone) => {
      const result = setupSchema.safeParse({ name: "Cafe", timezone });
      expect(result.error?.issues[0].message).toBe(
        "Pick your venue's time zone.",
      );
    },
  );

  it.each(["all_ages", "standard", "late_night"])(
    "accepts %s as the moderation level",
    (moderationLevel) => {
      const result = setupSchema.parse({
        name: "Cafe",
        timezone: "Europe/Paris",
        moderationLevel,
      });
      expect(result.moderationLevel).toBe(moderationLevel);
    },
  );

  it.each([null, "", "strict"])(
    "rejects %j as a moderation level",
    (moderationLevel) => {
      const result = setupSchema.safeParse({
        name: "Cafe",
        timezone: "Europe/Paris",
        moderationLevel,
      });
      expect(result.error?.issues[0].message).toBe(
        "Pick the rules for your board.",
      );
    },
  );
});
