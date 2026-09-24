import { describe, expect, it, vi } from "vitest";
import { ModerationUnavailableError } from "@/lib/moderation/openai";
import {
  moderateVenueName,
  NAME_REFUSED_MESSAGE,
  NAME_UNCHECKED_MESSAGE,
  venueNameSchema,
} from "./venue-name";

const env = { OPENAI_API_KEY: "sk-test", MODERATION_BLOCKLIST: undefined };

describe("venueNameSchema", () => {
  it("collapses runs of whitespace, so one venue can't look like two", () => {
    expect(venueNameSchema.parse("Corner   Coffee")).toBe("Corner Coffee");
    expect(venueNameSchema.parse("  Corner Coffee  ")).toBe("Corner Coffee");
  });

  it("keeps accents and punctuation a real venue name needs", () => {
    expect(venueNameSchema.parse("Café Olé & Co.")).toBe("Café Olé & Co.");
  });

  it.each([
    ["empty", ""],
    ["whitespace only", "   "],
    ["past the column limit", "a".repeat(121)],
  ])("refuses a name that is %s", (_label, name) => {
    expect(venueNameSchema.safeParse(name).success).toBe(false);
  });

  it("refuses a right-to-left override, which garbles the page title", () => {
    expect(venueNameSchema.safeParse("Corner‮Coffee").success).toBe(false);
  });

  it("refuses a zero-width joiner hiding inside a name", () => {
    expect(venueNameSchema.safeParse("Corner‍Coffee").success).toBe(false);
  });
});

describe("moderateVenueName", () => {
  it("allows a name the checks pass", async () => {
    const moderate = vi.fn().mockResolvedValue({ allowed: true });

    await expect(
      moderateVenueName("Corner Coffee", env, moderate),
    ).resolves.toEqual({ status: "allowed" });
    expect(moderate.mock.calls[0]?.[0]).toEqual({
      displayName: "Corner Coffee",
      caption: null,
      image: null,
    });
  });

  it("points a refused owner at a human, because real names get caught", async () => {
    const moderate = vi
      .fn()
      .mockResolvedValue({ allowed: false, reason: "blocklist:name:link" });

    await expect(
      moderateVenueName("Joe's .com Cafe", env, moderate),
    ).resolves.toEqual({
      status: "refused",
      message: NAME_REFUSED_MESSAGE,
    });
    expect(NAME_REFUSED_MESSAGE).toContain("hello@drawpin.io");
  });

  it("fails closed when the checks can't be reached", async () => {
    const moderate = vi
      .fn()
      .mockRejectedValue(new ModerationUnavailableError("offline"));

    await expect(
      moderateVenueName("Corner Coffee", env, moderate),
    ).resolves.toEqual({ status: "refused", message: NAME_UNCHECKED_MESSAGE });
  });

  it("rethrows anything that isn't moderation being down", async () => {
    const moderate = vi.fn().mockRejectedValue(new Error("bug"));

    await expect(
      moderateVenueName("Corner Coffee", env, moderate),
    ).rejects.toThrow("bug");
  });
});
