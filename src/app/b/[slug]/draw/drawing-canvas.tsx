"use client";

import { getStroke } from "perfect-freehand";
import {
  forwardRef,
  type PointerEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { strokeToSvgPath } from "./stroke-path";

/** Drawing resolution; the server resizes to the stored tile size. */
const CANVAS_SIZE = 768;

export type Stroke = {
  points: [x: number, y: number, pressure: number][];
  color: string;
  size: number;
  /** Mice and fingers report no real pressure, so it's simulated from speed. */
  simulatePressure: boolean;
};

export type DrawingCanvasHandle = {
  /** Exports the drawing as a PNG on a white background. */
  toBlob: () => Promise<Blob>;
};

type DrawingCanvasProps = {
  strokes: Stroke[];
  color: string;
  size: number;
  disabled?: boolean;
  onStrokeEnd: (stroke: Stroke) => void;
};

function drawStroke(context: CanvasRenderingContext2D, stroke: Stroke) {
  const outline = getStroke(stroke.points, {
    size: stroke.size,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: stroke.simulatePressure,
  });
  context.fillStyle = stroke.color;
  context.fill(new Path2D(strokeToSvgPath(outline)));
}

export const DrawingCanvas = forwardRef<
  DrawingCanvasHandle,
  DrawingCanvasProps
>(function DrawingCanvas({ strokes, color, size, disabled, onStrokeEnd }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeStroke = useRef<Stroke | null>(null);

  const redraw = useCallback(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;

    // Paint the background explicitly so the exported PNG isn't transparent.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    for (const stroke of strokes) drawStroke(context, stroke);
    if (activeStroke.current) drawStroke(context, activeStroke.current);
  }, [strokes]);

  useEffect(redraw, [redraw]);

  useImperativeHandle(ref, () => ({
    toBlob: () =>
      new Promise((resolve, reject) => {
        redraw();
        canvasRef.current?.toBlob(
          (blob) =>
            blob ? resolve(blob) : reject(new Error("Canvas export failed")),
          "image/png",
        );
      }),
  }));

  function toCanvasPoint(
    event: PointerEvent<HTMLCanvasElement>,
  ): [number, number, number] {
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = CANVAS_SIZE / rect.width;
    return [
      (event.clientX - rect.left) * scale,
      (event.clientY - rect.top) * scale,
      event.pressure || 0.5,
    ];
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (disabled || !event.isPrimary) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    activeStroke.current = {
      points: [toCanvasPoint(event)],
      color,
      size,
      simulatePressure: event.pointerType !== "pen",
    };
    redraw();
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const stroke = activeStroke.current;
    if (!stroke || !event.isPrimary) return;

    // Coalesced events recover the points the browser batched between
    // frames, which keeps fast strokes from looking jagged.
    const events = event.nativeEvent.getCoalescedEvents?.() ?? [];
    if (events.length > 0) {
      const rect = event.currentTarget.getBoundingClientRect();
      const scale = CANVAS_SIZE / rect.width;
      for (const coalesced of events) {
        stroke.points.push([
          (coalesced.clientX - rect.left) * scale,
          (coalesced.clientY - rect.top) * scale,
          coalesced.pressure || 0.5,
        ]);
      }
    } else {
      stroke.points.push(toCanvasPoint(event));
    }
    redraw();
  }

  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
    const stroke = activeStroke.current;
    if (!stroke || !event.isPrimary) return;
    activeStroke.current = null;
    onStrokeEnd(stroke);
  }

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      aria-label="Drawing area"
      // Stops the page from scrolling or zooming while drawing with a finger.
      className="aspect-square w-full touch-none rounded-lg border bg-white"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
});
