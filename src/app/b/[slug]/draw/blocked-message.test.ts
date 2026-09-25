// @vitest-environment node
import { describe, expect, it } from "vitest";
import { blockedMessage } from "./blocked-message";

describe("blockedMessage", () => {
  it("says what kind of problem, that the post isn't used, and the tries left", () => {
    expect(blockedMessage("hateful", 2)).toBe(
      "This one can't go up — it looks like it has hateful words or symbols. Your post for today isn't used. 2 tries left before 4:00 AM.",
    );
  });

  it("says one try, not one tries", () => {
    expect(blockedMessage("sexual", 1)).toMatch(/1 try left/);
  });

  it.each([
    ["sexual", "sexual content"],
    ["violent", "violence"],
    ["contact", "a link, an email or a phone number"],
    ["language", "language that isn't allowed here"],
  ] as const)("describes %s", (category, words) => {
    expect(blockedMessage(category, 2)).toContain(words);
  });

  it("never names the word or rule that matched", () => {
    // The category is all the poster needs; the rule would teach evasion.
    for (const category of [
      "hateful",
      "sexual",
      "violent",
      "contact",
      "language",
    ] as const) {
      expect(blockedMessage(category, 2)).not.toMatch(
        /blocklist|openai|vision/,
      );
    }
  });
});
