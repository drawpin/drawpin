import { describe, expect, it } from "vitest";
import { notVotableBecause } from "./votable";

const tile = { id: "t1", isOwn: false, isGuest: false };
const none = new Set<string>();

describe("notVotableBecause", () => {
  it("lets you pick someone else's tile", () => {
    expect(notVotableBecause(tile, none)).toBeNull();
  });

  it("never lets you pick your own tile", () => {
    expect(notVotableBecause({ ...tile, isOwn: true }, none)).toBe("Yours");
  });

  it("says Voted first for a tile you already voted for", () => {
    expect(notVotableBecause(tile, new Set(["t1"]))).toBe("Voted");
  });

  it("keeps guest tiles out of the running", () => {
    expect(notVotableBecause({ ...tile, isGuest: true }, none)).toBe("Guest");
  });
});
