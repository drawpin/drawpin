import { describe, expect, it } from "vitest";
import { setupSchema } from "./schema";

describe("setupSchema", () => {
  it("accepts a name and an IANA time zone", () => {
    expect(
      setupSchema.parse({
        name: "  Blue Bottle ",
        timezone: "America/Chicago",
      }),
    ).toEqual({ name: "Blue Bottle", timezone: "America/Chicago" });
  });

  it("requires a name", () => {
    const result = setupSchema.safeParse({
      name: "   ",
      timezone: "Europe/Paris",
    });
    expect(result.error?.issues[0].message).toBe("Enter a name for your board.");
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
});
