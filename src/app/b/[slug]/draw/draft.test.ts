// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { fromSteps, parseDraft, toSteps } from "./draft";
import type { DrawOp } from "./render";
import type { Point } from "./shapes";

// Lifting pixels needs a real canvas, which node doesn't have; the lift
// itself is the same with or without a turn, so a stand-in is enough here.
vi.mock("./render", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./render")>()),
  liftSelection: (_ops: DrawOp[], loop: Point[]) => ({
    hole: loop,
    image: {} as HTMLCanvasElement,
    target: { x: 0, y: 0, width: 10, height: 10 },
  }),
}));

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

describe("drafts with a lasso move", () => {
  const hole: Point[] = [
    [10, 10],
    [60, 10],
    [10, 50],
  ];
  const target = { x: 100, y: 200, width: 50, height: 40 };
  const image = {} as HTMLCanvasElement;
  const unturned = { kind: "paste", hole, target } as const;

  it("keeps the turn of a rotated paste", () => {
    const steps = toSteps([{ ...unturned, image, angle: 0.5 }]);
    expect(steps).toEqual([{ ...unturned, angle: 0.5 }]);
    expect(parseDraft(draft(steps), NOW)).toEqual(steps);
  });

  it("leaves the turn out of an unturned paste, as drafts always did", () => {
    expect(toSteps([{ ...unturned, image }])).toEqual([unturned]);
    expect(toSteps([{ ...unturned, image, angle: 0 }])).toEqual([unturned]);
  });

  it("still reads a paste saved before the lasso could rotate", () => {
    expect(parseDraft(draft([unturned]), NOW)).toEqual([unturned]);
  });

  it("rejects a turn that isn't an angle", () => {
    expect(parseDraft(draft([{ ...unturned, angle: 40 }]), NOW)).toBeNull();
    expect(parseDraft(draft([{ ...unturned, angle: "1" }]), NOW)).toBeNull();
  });

  it("puts the paste back down turned, and an old one unturned", () => {
    const ops = fromSteps([unturned, { ...unturned, angle: -1 }]);

    expect(ops).toHaveLength(2);
    expect(ops[0]).not.toHaveProperty("angle");
    expect(ops[1]).toMatchObject({ kind: "paste", target, angle: -1 });
  });
});
