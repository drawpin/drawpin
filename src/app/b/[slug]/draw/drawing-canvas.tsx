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
  type DrawOp,
  fillAt,
  renderScene,
  renderTile,
  screenToTile,
  type Shape,
  type Stroke,
  TILE_SIZE,
  type View,
  WHOLE_TILE,
  zoomAround,
} from "./render";
import { recognizeShape } from "./recognize";
import { isTooSmall, shapeEnd } from "./shapes";
import { isShapeTool, type Tool } from "./tools";

export type { DrawOp } from "./render";

export type DrawingCanvasHandle = {
  /** Exports the drawing as a PNG on a white background, at tile size. */
  toBlob: () => Promise<Blob>;
};

type DrawingCanvasProps = {
  ops: DrawOp[];
  color: string;
  size: number;
  /**
   * What a finger does: draw with a brush, fill the area it taps, or drag out
   * a shape.
   */
  tool: Tool;
  showGrid: boolean;
  /**
   * Holding a pen or marker stroke still at the end snaps it to the line or
   * shape it looks like (see recognize.ts).
   */
  assist: boolean;
  disabled?: boolean;
  onDraw: (op: DrawOp) => void;
};

/** How long a finger has to stay still before the assist snaps the stroke. */
const HOLD_MS = 500;

/** How far, in CSS pixels, a finger can drift and still count as still. */
const HOLD_SLOP = 8;

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
  { ops, color, size, tool, showGrid, assist, disabled, onDraw },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // What the finger that's down is drawing: a stroke, or a shape being dragged
  // out. Kept outside React state so a stroke doesn't re-render per point.
  const active = useRef<Stroke | Shape | null>(null);
  // Every finger currently on the canvas. Two or more means the drawing is
  // being moved around rather than drawn on.
  const fingers = useRef(new Map<number, Finger>());
  const gesture = useRef<Gesture | null>(null);
  // The snap assist's timer, and where the finger was when it last started:
  // moving further than HOLD_SLOP from there starts it again.
  const holdTimer = useRef<number | null>(null);
  const holdAnchor = useRef<Finger | null>(null);
  // What a snapped shape does as the finger keeps moving: a line's far end
  // follows it, so it can be swung and stretched; a closed shape stays put.
  const snapped = useRef<"line" | "fixed" | null>(null);
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

    renderScene(context, { ops, active: active.current, showGrid });
  }, [ops, showGrid, view]);

  useEffect(redraw, [redraw, backingSize]);

  // A snap due after the canvas is gone has nothing to snap.
  useEffect(() => {
    const timer = holdTimer;
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  function cancelHold() {
    if (holdTimer.current !== null) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  function startHold(finger: Finger) {
    cancelHold();
    holdAnchor.current = finger;
    holdTimer.current = window.setTimeout(snapToShape, HOLD_MS);
  }

  /** The finger has been still long enough: swap the stroke for its shape. */
  function snapToShape() {
    holdTimer.current = null;
    const drawing = active.current;
    if (drawing?.kind !== "stroke") return;

    const geometry = recognizeShape(drawing.points);
    if (!geometry) return;

    active.current = {
      kind: "shape",
      color: drawing.color,
      size: drawing.size,
      ...geometry,
    };
    snapped.current = geometry.shape === "line" ? "line" : "fixed";
    // A small buzz where the phone can, so the change is felt as well as seen.
    navigator.vibrate?.(10);
    redraw();
  }

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
        renderTile(ops).toBlob(
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
    const finger = fingerAt(event, rect);
    fingers.current.set(event.pointerId, finger);
    cancelHold();
    holdAnchor.current = null;
    snapped.current = null;

    if (fingers.current.size >= 2) {
      // A second finger means they're moving the drawing, not drawing on it.
      // Whatever the first one had started is thrown away rather than left as
      // an accidental dot.
      active.current = null;
      const [first, second] = [...fingers.current.values()];
      gesture.current = {
        distance: distanceBetween(first, second),
        midpoint: midpointOf(first, second),
        view,
      };
      redraw();
      return;
    }

    if (tool === "fill") {
      // A bucket is a tap, not a stroke: work out the area now and keep it.
      const [x, y] = toTilePoint(event, rect);
      const fill = fillAt(ops, x, y, color);
      if (fill) onDraw(fill);
      return;
    }

    if (isShapeTool(tool)) {
      const [x, y] = toTilePoint(event, rect);
      active.current = {
        kind: "shape",
        shape: tool,
        from: [x, y],
        to: [x, y],
        color,
        size,
      };
      redraw();
      return;
    }

    active.current = {
      kind: "stroke",
      points: [toTilePoint(event, rect)],
      color,
      size,
      brush: tool,
      // Fixed now so the spray lands in the same places on every redraw.
      seed: Math.floor(Math.random() * 2 ** 31),
      simulatePressure: event.pointerType !== "pen",
    };
    // Spray is meant to be rough, and a straightened eraser line is not
    // something anyone reaches for, so only pen and marker snap.
    if (assist && (tool === "pen" || tool === "marker")) startHold(finger);
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

    const drawing = active.current;
    if (!drawing) return;

    if (drawing.kind === "shape") {
      if (drawing.shape === "polygon" || snapped.current === "fixed") return;
      // Only where the finger is now matters, so batched points are skipped.
      const [x, y] = toTilePoint(event, rect);
      drawing.to = shapeEnd(
        drawing.shape,
        drawing.from,
        [x, y],
        event.shiftKey,
      );
      redraw();
      return;
    }

    const stroke = drawing;
    // Coalesced events recover the points the browser batched between
    // frames, which keeps fast strokes from looking jagged.
    const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? [];
    if (coalesced.length > 0) {
      for (const point of coalesced)
        stroke.points.push(toTilePoint(point, rect));
    } else {
      stroke.points.push(toTilePoint(event, rect));
    }

    // Still moving: the hold starts over from here.
    const finger = fingers.current.get(event.pointerId)!;
    if (
      holdAnchor.current &&
      distanceBetween(finger, holdAnchor.current) > HOLD_SLOP
    ) {
      startHold(finger);
    }
    redraw();
  }

  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
    fingers.current.delete(event.pointerId);
    if (fingers.current.size < 2) gesture.current = null;
    cancelHold();
    holdAnchor.current = null;

    const drawing = active.current;
    // A stroke or shape only counts when the finger that drew it was the only
    // one down; anything else was a gesture.
    if (!drawing || fingers.current.size > 0) return;
    active.current = null;

    // A tap with the shape tool isn't a shape; drop it rather than leave a dot.
    if (
      drawing.kind === "shape" &&
      drawing.shape !== "polygon" &&
      isTooSmall(drawing.from, drawing.to)
    ) {
      redraw();
      return;
    }
    onDraw(drawing);
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
