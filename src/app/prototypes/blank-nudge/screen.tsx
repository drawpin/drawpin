"use client";

import {
  ArrowArcLeftIcon,
  ArrowArcRightIcon,
  ArrowLeftIcon,
  EraserIcon,
  FadersHorizontalIcon,
  LassoIcon,
  PaintBucketIcon,
  PencilSimpleIcon,
  ShapesIcon,
  SprayBottleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { type ReactNode, useEffect, useRef, useState } from "react";

/** The nudge's state, which every variant reads the same way. */
export type NudgeState = {
  /** Showing: Post was tapped on a blank tile, and nothing is drawn since. */
  active: boolean;
  /** Counts blank Posts, so a variant can replay its entrance on each. */
  attempt: number;
};

/** What a variant puts on the screen; anything left out isn't shown. */
export type NudgeSlots = {
  /** Over the canvas, inside its frame. */
  onCanvas?: ReactNode;
  /** Between the colours and the Post button. */
  belowCanvas?: ReactNode;
  /** The Post button's label, and extra classes for it. */
  postLabel?: ReactNode;
  postClassName?: string;
  /** Extra classes for the canvas frame. */
  canvasClassName?: string;
};

type Point = { x: number; y: number };

const SWATCHES = [
  "#0f1b2d",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
];
const TOOLS = [
  PencilSimpleIcon,
  PaintBucketIcon,
  SprayBottleIcon,
  EraserIcon,
  ShapesIcon,
  LassoIcon,
];

/**
 * A stand-in for the draw screen, close enough to judge the nudge in place:
 * the header, the tool rail, a canvas you can really draw on and undo, the
 * colours and the Post button. Only the nudge differs between variants; the
 * behaviour (as approved on 2026-10-02) is the same in all of them.
 */
export function DrawScreen({
  slots,
}: {
  slots: (state: NudgeState) => NudgeSlots;
}) {
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [nudge, setNudge] = useState<NudgeState>({
    active: false,
    attempt: 0,
  });
  // Gone for good once something is drawn; erasing doesn't bring it back.
  if (nudge.active && strokes.length > 0) setNudge({ ...nudge, active: false });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<Point[] | null>(null);
  const [color, setColor] = useState(SWATCHES[0]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 10;
    context.strokeStyle = color;
    for (const stroke of strokes) {
      context.beginPath();
      stroke.forEach((point, index) =>
        index
          ? context.lineTo(point.x, point.y)
          : context.moveTo(point.x, point.y),
      );
      context.stroke();
    }
  }, [strokes, color]);

  function pointFor(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = event.currentTarget.width / rect.width;
    return {
      x: (event.clientX - rect.left) * scale,
      y: (event.clientY - rect.top) * scale,
    };
  }

  const { onCanvas, belowCanvas, postLabel, postClassName, canvasClassName } =
    slots(nudge);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 bg-white px-4 pt-6 pb-10">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center">
          <ArrowLeftIcon className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Draw a tile
          </h1>
          <p className="text-muted-foreground text-sm">Maple Street Café</p>
        </div>
      </div>

      <div className="text-muted-foreground flex justify-end gap-1">
        <button
          type="button"
          aria-label="Undo"
          onClick={() => setStrokes((current) => current.slice(0, -1))}
          className="hover:text-foreground grid size-11 place-items-center rounded-full"
        >
          <ArrowArcLeftIcon className="size-5" />
        </button>
        <span className="grid size-11 place-items-center opacity-50">
          <ArrowArcRightIcon className="size-5" />
        </span>
        <button
          type="button"
          aria-label="Clear"
          onClick={() => setStrokes([])}
          className="hover:text-foreground grid size-11 place-items-center rounded-full"
        >
          <TrashIcon className="size-5" />
        </button>
        <span className="grid size-11 place-items-center">
          <FadersHorizontalIcon className="size-5" />
        </span>
      </div>

      <div className="flex gap-3">
        <div className="flex flex-col items-center gap-1 rounded-2xl border p-1">
          {TOOLS.map((Tool, index) => (
            <span
              key={index}
              className={`grid size-11 place-items-center rounded-xl ${index === 0 ? "ring-primary bg-secondary ring-2" : ""}`}
            >
              <Tool className="size-5" />
            </span>
          ))}
          <span
            className="m-1.5 size-6 rounded-full border-2 border-white ring-1 ring-black/15"
            style={{ backgroundColor: color }}
          />
        </div>
        <div
          className={`relative aspect-square flex-1 overflow-hidden rounded-xl border bg-white ${canvasClassName ?? ""}`}
        >
          <canvas
            ref={canvasRef}
            width={600}
            height={600}
            className="absolute inset-0 size-full touch-none"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              drawing.current = [pointFor(event)];
            }}
            onPointerMove={(event) => {
              if (!drawing.current) return;
              drawing.current.push(pointFor(event));
              // Draw as you go: the stroke joins the list when it's done.
              const context = event.currentTarget.getContext("2d");
              const points = drawing.current;
              if (context && points.length > 1) {
                context.strokeStyle = color;
                context.beginPath();
                context.moveTo(points.at(-2)!.x, points.at(-2)!.y);
                context.lineTo(points.at(-1)!.x, points.at(-1)!.y);
                context.stroke();
              }
            }}
            onPointerUp={() => {
              const stroke = drawing.current;
              drawing.current = null;
              if (stroke && stroke.length > 1)
                setStrokes((current) => [...current, stroke]);
            }}
          />
          {onCanvas}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">Colours</p>
        <div className="flex gap-2">
          {SWATCHES.map((swatch) => (
            <button
              key={swatch}
              type="button"
              aria-label={`Colour ${swatch}`}
              onClick={() => setColor(swatch)}
              className={`size-9 rounded-full border ${swatch === color ? "ring-primary ring-2 ring-offset-2" : ""}`}
              style={{ backgroundColor: swatch }}
            />
          ))}
        </div>
      </div>

      {belowCanvas}

      <button
        type="button"
        onClick={() => {
          if (strokes.length === 0)
            setNudge((current) => ({
              active: true,
              attempt: current.attempt + 1,
            }));
        }}
        className={`bg-primary text-primary-foreground focus-visible:ring-highlight mt-1 h-14 w-full rounded-full text-lg font-bold outline-none focus-visible:ring-3 ${postClassName ?? ""}`}
      >
        {postLabel ?? "Post my tile"}
      </button>
    </main>
  );
}
