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
 * The mouse cursor over the canvas for each tool, as a CSS `cursor` value.
 *
 * Built-in cursors for now; a tool can switch to its own picture later
 * (`url(...) x y, crosshair`) without anything else changing. The eraser has
 * none because the canvas draws its outline instead, at the size it erases.
 */
export function cursorFor(tool: Tool): string {
  if (tool === "eraser") return "none";
  if (tool === "fill") return "cell";
  return "crosshair";
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
