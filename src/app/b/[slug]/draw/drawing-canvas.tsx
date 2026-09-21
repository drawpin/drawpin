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
import { Button } from "@/components/ui/button";
import {
  backingSizeFor,
  clampView,
  renderScene,
  renderTile,
  screenToTile,
  type Stroke,
  TILE_SIZE,
  type View,
  WHOLE_TILE,
  zoomAround,
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

/** Where a finger is, in CSS pixels within the canvas. */
type Finger = { x: number; y: number };

/** What a two-finger gesture started from, so it can be measured against. */
type Gesture = { distance: number; midpoint: Finger; view: View };

function distanceBetween(a: Finger, b: Finger): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpointOf(a: Finger, b: Finger): Finger {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export const DrawingCanvas = forwardRef<
  DrawingCanvasHandle,
  DrawingCanvasProps
>(function DrawingCanvas(
  { strokes, color, size, showGrid, disabled, onStrokeEnd },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeStroke = useRef<Stroke | null>(null);
  // Every finger currently on the canvas. Two or more means the drawing is
  // being moved around rather than drawn on.
  const fingers = useRef(new Map<number, Finger>());
  const gesture = useRef<Gesture | null>(null);
  const [backingSize, setBackingSize] = useState(TILE_SIZE);
  const [view, setView] = useState<View>(WHOLE_TILE);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    // Device pixels per tile unit, then the window onto the tile. Everything
    // downstream draws in tile units and knows nothing about either.
    const density = canvas.width / TILE_SIZE;
    const scale = density * view.scale;
    context.setTransform(
      scale,
      0,
      0,
      scale,
      -view.offsetX * scale,
      -view.offsetY * scale,
    );
    // The canvas keeps whatever is outside the zoomed window, so clear it.
    context.clearRect(0, 0, canvas.width, canvas.height);

    renderScene(context, {
      strokes,
      activeStroke: activeStroke.current,
      showGrid,
    });
  }, [strokes, showGrid, view]);

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
        // Rendered fresh at tile size, whole and without a grid: zooming in
        // is a way of looking at the drawing, not part of it.
        renderTile(strokes).toBlob(
          (blob) =>
            blob ? resolve(blob) : reject(new Error("Canvas export failed")),
          "image/png",
        );
      }),
  }));

  function fingerAt(
    event: { clientX: number; clientY: number },
    rect: DOMRect,
  ): Finger {
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function toTilePoint(
    event: { clientX: number; clientY: number; pressure: number },
    rect: DOMRect,
  ): [number, number, number] {
    const finger = fingerAt(event, rect);
    const [x, y] = screenToTile(view, finger.x, finger.y, rect.width);
    return [x, y, event.pressure || 0.5];
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // A pointer can be gone by the time this runs, and capturing is only an
      // improvement: without it a stroke ends when the finger leaves the
      // canvas, which is survivable.
    }
    fingers.current.set(event.pointerId, fingerAt(event, rect));

    if (fingers.current.size >= 2) {
      // A second finger means they're moving the drawing, not drawing on it.
      // Whatever the first one had started is thrown away rather than left as
      // an accidental dot.
      activeStroke.current = null;
      const [first, second] = [...fingers.current.values()];
      gesture.current = {
        distance: distanceBetween(first, second),
        midpoint: midpointOf(first, second),
        view,
      };
      redraw();
      return;
    }

    activeStroke.current = {
      points: [toTilePoint(event, rect)],
      color,
      size,
      simulatePressure: event.pointerType !== "pen",
    };
    redraw();
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!fingers.current.has(event.pointerId)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    fingers.current.set(event.pointerId, fingerAt(event, rect));

    const start = gesture.current;
    if (start && fingers.current.size >= 2) {
      const [first, second] = [...fingers.current.values()];
      const midpoint = midpointOf(first, second);
      const ratio = distanceBetween(first, second) / (start.distance || 1);

      // Zoom about the point between the fingers, then follow them, so the
      // drawing stays under the hand doing the moving.
      const zoomed = zoomAround(
        start.view,
        start.view.scale * ratio,
        start.midpoint.x,
        start.midpoint.y,
        rect.width,
      );
      const visible = TILE_SIZE / zoomed.scale;
      setView(
        clampView({
          scale: zoomed.scale,
          offsetX:
            zoomed.offsetX -
            ((midpoint.x - start.midpoint.x) / rect.width) * visible,
          offsetY:
            zoomed.offsetY -
            ((midpoint.y - start.midpoint.y) / rect.width) * visible,
        }),
      );
      return;
    }

    const stroke = activeStroke.current;
    if (!stroke) return;

    // Coalesced events recover the points the browser batched between
    // frames, which keeps fast strokes from looking jagged.
    const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? [];
    if (coalesced.length > 0) {
      for (const point of coalesced)
        stroke.points.push(toTilePoint(point, rect));
    } else {
      stroke.points.push(toTilePoint(event, rect));
    }
    redraw();
  }

  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
    fingers.current.delete(event.pointerId);
    if (fingers.current.size < 2) gesture.current = null;

    const stroke = activeStroke.current;
    // A stroke only counts when the finger that drew it was the only one
    // down; anything else was a gesture.
    if (!stroke || fingers.current.size > 0) return;
    activeStroke.current = null;
    onStrokeEnd(stroke);
  }

  /** Zooming with a wheel, for anyone drawing with a mouse or trackpad. */
  function handleWheel(event: React.WheelEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const finger = fingerAt(event, rect);
    const factor = Math.exp(-event.deltaY / 300);
    setView((current) =>
      zoomAround(
        current,
        current.scale * factor,
        finger.x,
        finger.y,
        rect.width,
      ),
    );
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={backingSize}
        height={backingSize}
        aria-label="Drawing area"
        // Stops the page scrolling or zooming while a finger is on the tile;
        // pinching is handled here instead.
        className="aspect-square w-full touch-none rounded-lg border bg-white"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      />

      {view.scale > 1 && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="absolute right-2 bottom-2 shadow"
          onClick={() => setView(WHOLE_TILE)}
        >
          {view.scale.toFixed(1)}× · Fit
        </Button>
      )}
    </div>
  );
});
