// @vitest-environment node
import { describe, expect, it } from "vitest";
import { fromSteps, parseDraft, toSteps } from "./draft";
import type { DrawOp } from "./render";

const stroke: DrawOp = {
  kind: "stroke",
  points: [
    [10, 10, 0.5],
    [40, 60, 0.5],
  ],
  color: "#111827",
  size: 18,
  brush: "pen",
  seed: 7,
  simulatePressure: true,
  even: true,
};

const line: DrawOp = {
  kind: "shape",
  color: "#ef4444",
  size: 6,
  shape: "line",
  from: [0, 0],
  to: [100, 100],
};

const NOW = 1_800_000_000_000;
const draft = (steps: unknown, savedAt = NOW) =>
  JSON.stringify({ savedAt, steps });

describe("drawing drafts", () => {
  it("keeps strokes and shapes exactly through a round trip", () => {
    const raw = draft(toSteps([stroke, line]));
    const steps = parseDraft(raw, NOW);

    expect(steps).not.toBeNull();
    expect(fromSteps(steps!)).toEqual([stroke, line]);
  });

  it("forgets a draft over an hour old", () => {
    expect(parseDraft(draft([], NOW - 61 * 60 * 1000), NOW)).toBeNull();
  });

  it.each([
    ["not JSON", "{oops"],
    ["a colour that isn't a hex", draft([{ ...stroke, color: "red" }])],
    [
      "an unknown step",
      draft([{ kind: "image", src: "data:image/png;base64," }]),
    ],
    ["a stroke with no points", draft([{ ...stroke, points: [] }])],
  ])("rejects %s", (_what, raw) => {
    expect(parseDraft(raw, NOW)).toBeNull();
  });

  it("has nothing to restore when nothing was saved", () => {
    expect(parseDraft(null, NOW)).toBeNull();
  });
});
