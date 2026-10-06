import type { Brush } from "./render";
import { type ShapeKind, SHAPES } from "./shapes";

/**
 * What a finger on the canvas does. One value rather than a brush plus
 * separate switches, so exactly one tool is ever active and a new one is
 * another value here instead of another flag to keep in step.
 */
export type Tool = Brush | "fill" | "lasso" | ShapeKind;

/** Pen first: it's what most people reach for, and what they already know. */
export const BRUSHES: { value: Brush; name: string }[] = [
  { value: "pen", name: "Pen" },
  { value: "marker", name: "Marker" },
  { value: "spray", name: "Spray" },
  { value: "eraser", name: "Eraser" },
];

export function isShapeTool(tool: Tool): tool is ShapeKind {
  return SHAPES.some((shape) => shape.value === tool);
}

/**
 * The mark the canvas draws in place of the cursor for each tool (issue
 * #157). A brush shows a ring the size of what it paints, so its size is
 * seen before it's used. The bucket, the shapes and the lasso act at a point
 * whatever the size, so a ring would only mislead; they get a crosshair.
 */
export function markFor(tool: Tool): "ring" | "cross" {
  return BRUSHES.some((brush) => brush.value === tool) ? "ring" : "cross";
}

/** What a tool is called on its button, for showing which one is in hand. */
export function toolName(tool: Tool): string {
  if (tool === "fill") return "Fill";
  if (tool === "lasso") return "Lasso";
  return (
    [...BRUSHES, ...SHAPES].find((option) => option.value === tool)?.name ??
    tool
  );
}
