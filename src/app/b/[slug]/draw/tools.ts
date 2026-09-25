import type { Brush } from "./render";
import { type ShapeKind, SHAPES } from "./shapes";

/**
 * What a finger on the canvas does. One value rather than a brush plus
 * separate switches, so exactly one tool is ever active and a new one is
 * another value here instead of another flag to keep in step.
 */
export type Tool = Brush | "fill" | ShapeKind;

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
