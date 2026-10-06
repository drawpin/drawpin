import { z } from "zod";
import { type DrawOp, fillAt, liftSelection } from "./render";

/**
 * A drawing kept across a sign-in.
 *
 * Signing in with Google leaves the page, which would lose a guest's drawing
 * right when they've finished it and tapped Post. So the drawing's steps are
 * put in `sessionStorage` on the way out and replayed on the way back.
 *
 * Steps, never pixels. Strokes and shapes are kept as they are. A fill keeps
 * only where it was tapped, and a lasso move only its loop and where it was
 * put down; both are worked out again from the steps before them. Nothing
 * restored here can put a picture on the canvas that wasn't drawn with the
 * tools, and everything read back is validated first: storage belongs to the
 * browser, not to us.
 */

/** Newer than this is kept; older, and it's someone's abandoned drawing. */
const DRAFT_MAX_AGE_MS = 60 * 60 * 1000;

/** Far beyond any real drawing, so a tampered draft can't stall the page. */
const MAX_STEPS = 2000;
const MAX_POINTS = 20_000;

const color = z.string().regex(/^#[0-9a-f]{6}$/i);
const coordinate = z.number().finite().min(-10_000).max(10_000);
const point = z.tuple([coordinate, coordinate]);

const strokeStep = z.object({
  kind: z.literal("stroke"),
  points: z
    .array(z.tuple([coordinate, coordinate, z.number().finite().min(0).max(1)]))
    .min(1)
    .max(MAX_POINTS),
  color,
  size: z.number().finite().min(1).max(200),
  brush: z.enum(["pen", "marker", "spray", "eraser"]),
  seed: z.number().int(),
  simulatePressure: z.boolean(),
  even: z.boolean().optional(),
});

const shapeStep = z
  .object({
    kind: z.literal("shape"),
    color,
    size: z.number().finite().min(1).max(200),
  })
  .and(
    z.union([
      z.object({
        shape: z.enum(["line", "rectangle"]),
        from: point,
        to: point,
      }),
      z.object({
        shape: z.literal("ellipse"),
        from: point,
        to: point,
        rotation: z.number().finite().optional(),
      }),
      z.object({
        shape: z.literal("polygon"),
        points: z.array(point).min(3).max(MAX_POINTS),
      }),
    ]),
  );

const fillStep = z.object({ kind: z.literal("fill"), color, at: point });

const pasteStep = z.object({
  kind: z.literal("paste"),
  hole: z.array(point).min(3).max(MAX_POINTS),
  target: z.object({
    x: coordinate,
    y: coordinate,
    width: z.number().finite().positive().max(10_000),
    height: z.number().finite().positive().max(10_000),
  }),
});

const draftSchema = z.object({
  savedAt: z.number(),
  steps: z
    .array(z.union([strokeStep, shapeStep, fillStep, pasteStep]))
    .max(MAX_STEPS),
});

export type DraftStep = z.infer<typeof draftSchema>["steps"][number];

/** A drawing's steps, with fills and lasso moves reduced to how to redo them. */
export function toSteps(ops: DrawOp[]): DraftStep[] {
  return ops.map((op): DraftStep => {
    if (op.kind === "fill") return { kind: "fill", color: op.color, at: op.at };
    if (op.kind === "paste") {
      return { kind: "paste", hole: op.hole, target: op.target };
    }
    return op;
  });
}

/**
 * Replays steps into a drawing. A fill or lasso move that no longer finds
 * anything to act on is skipped rather than failing the whole drawing.
 */
export function fromSteps(steps: DraftStep[]): DrawOp[] {
  const ops: DrawOp[] = [];
  for (const step of steps) {
    if (step.kind === "fill") {
      const fill = fillAt(ops, step.at[0], step.at[1], step.color);
      if (fill) ops.push(fill);
    } else if (step.kind === "paste") {
      const lifted = liftSelection(ops, step.hole);
      if (lifted) ops.push({ kind: "paste", ...lifted, target: step.target });
    } else {
      ops.push(step);
    }
  }
  return ops;
}

/** Validates what came back from storage; `null` for anything off. */
export function parseDraft(
  raw: string | null,
  now: number,
): DraftStep[] | null {
  if (!raw) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = draftSchema.safeParse(json);
  if (!parsed.success) return null;
  if (now - parsed.data.savedAt > DRAFT_MAX_AGE_MS) return null;
  return parsed.data.steps;
}

function draftKey(slug: string): string {
  return `drawpin:draft:${slug}`;
}

/** Keeps a drawing for the trip to sign in. Best-effort: storage can be blocked. */
export function saveDraft(slug: string, ops: DrawOp[]): void {
  try {
    sessionStorage.setItem(
      draftKey(slug),
      JSON.stringify({ savedAt: Date.now(), steps: toSteps(ops) }),
    );
  } catch {
    // Private mode or a full quota: the drawing just isn't kept.
  }
}

/**
 * The drawing kept for this board, rebuilt, and forgotten so it's restored
 * once. `null` when there isn't one, or it's stale or malformed.
 */
export function takeDraft(slug: string): DrawOp[] | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(draftKey(slug));
    sessionStorage.removeItem(draftKey(slug));
  } catch {
    return null;
  }
  const steps = parseDraft(raw, Date.now());
  if (!steps || steps.length === 0) return null;
  return fromSteps(steps);
}
