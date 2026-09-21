"use client";

import {
  forwardRef,
  type PointerEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  backingSizeFor,
  renderScene,
  renderTile,
  type Stroke,
  TILE_SIZE,
} from "./render";

export type { Stroke } from "./render";

export type DrawingCanvasHandle = {
  /** Exports the drawing as a PNG on a white background, at tile size. */
  toBlob: () => Promise<Blob>;
};

type DrawingCanvasProps = {
  strokes: Stroke[];
  color: string;
  size: number;
  showGrid: boolean;
  disabled?: boolean;
  onStrokeEnd: (stroke: Stroke) => void;
};

export const DrawingCanvas = forwardRef<
  DrawingCanvasHandle,
  DrawingCanvasProps
>(function DrawingCanvas(
  { strokes, color, size, showGrid, disabled, onStrokeEnd },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeStroke = useRef<Stroke | null>(null);
  // Held in state rather than read on each paint: changing it resizes the
  // backing store, which clears the canvas, so it has to drive a redraw.
  const [backingSize, setBackingSize] = useState(TILE_SIZE);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    // Everything below draws in tile units; this is the only place that knows
    // how many device pixels one of those is worth.
    const scale = canvas.width / TILE_SIZE;
    context.setTransform(scale, 0, 0, scale, 0, 0);

    renderScene(context, {
      strokes,
      activeStroke: activeStroke.current,
      showGrid,
    });
  }, [strokes, showGrid]);

  useEffect(redraw, [redraw, backingSize]);

  // The canvas is as wide as its container, which changes with the window and
  // when a phone is turned.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const measure = () => {
      const width = canvas.getBoundingClientRect().width;
      if (width > 0) {
        setBackingSize(backingSizeFor(width, window.devicePixelRatio));
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useImperativeHandle(ref, () => ({
    toBlob: () =>
      new Promise((resolve, reject) => {
        // Rendered fresh at tile size: what's on screen is bigger, and has a
        // grid on it that nobody else should see.
        renderTile(strokes).toBlob(
          (blob) =>
            blob ? resolve(blob) : reject(new Error("Canvas export failed")),
          "image/png",
        );
      }),
  }));

  /** Screen coordinates to tile coordinates. */
  function toTilePoint(
    event: { clientX: number; clientY: number; pressure: number },
    rect: DOMRect,
  ): [number, number, number] {
    const scale = TILE_SIZE / rect.width;
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
      points: [toTilePoint(event, event.currentTarget.getBoundingClientRect())],
      color,
      size,
      simulatePressure: event.pointerType !== "pen",
    };
    redraw();
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const stroke = activeStroke.current;
    if (!stroke || !event.isPrimary) return;

    const rect = event.currentTarget.getBoundingClientRect();
    // Coalesced events recover the points the browser batched between
    // frames, which keeps fast strokes from looking jagged.
    const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? [];
    if (coalesced.length > 0) {
      for (const point of coalesced) {
        stroke.points.push(toTilePoint(point, rect));
      }
    } else {
      stroke.points.push(toTilePoint(event, rect));
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
      width={backingSize}
      height={backingSize}
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
