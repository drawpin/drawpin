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
  brushWidthOnScreen,
  colorAt,
  type DrawOp,
  drawSelectionFrame,
  fillAt,
  type Lifted,
  liftSelection,
  paintOps,
  paintOverlay,
  panBy,
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
import {
  contains,
  type Corner,
  handleAt,
  moveBy,
  type Rect,
  resizeFromCorner,
  sameRect,
} from "./selection";
import { pointerRole, pressedByLift } from "./pointers";
import { isTooSmall, keepsPerfect, type Point, shapeEnd } from "./shapes";
import { isShapeTool, markFor, type Tool, toolName } from "./tools";

export type { DrawOp } from "./render";

export type DrawingCanvasHandle = {
  /**
   * Exports the drawing as a PNG on a white background, at tile size — with
   * a lasso selection that hasn't been put down yet included where it is.
   */
  toBlob: () => Promise<Blob>;
  /** Puts a lasso selection down where it is. `false` if there wasn't one. */
  commitSelection: () => boolean;
  /** Drops a lasso selection back where it came from. `false` if there wasn't one. */
  cancelSelection: () => boolean;
};

/** A lasso selection, plus where it was lifted from. */
type Floating = Lifted & { source: Rect };

/** How far from a corner handle, in CSS pixels, a finger still grabs it. */
const HANDLE_REACH = 22;

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
  /**
   * Whether the pen's width follows pressure (or, without a stylus, speed).
   * Off, it draws an even line on every device.
   */
  pressure: boolean;
  disabled?: boolean;
  /**
   * The size is being changed: show the brush at that size in the middle of
   * the canvas, since on a phone there's no pointer to show it on.
   */
  previewSize?: boolean;
  /**
   * The colour picker is armed: the next tap reads the colour under it and
   * hands it to `onPickColor` instead of drawing.
   */
  pickingColor?: boolean;
  onPickColor?: (color: string) => void;
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

/** The pointer the cursor mark follows, where the browser last saw it. */
type Hover = {
  pointerId: number;
  touch: boolean;
  clientX: number;
  clientY: number;
};

/**
 * The smallest the brush ring is drawn, in CSS pixels: a fine brush zoomed
 * out is narrower than a pixel, and the mark is the only cursor there is.
 */
const MIN_RING = 4;

/** How wide the crosshair is, in CSS pixels. */
const CROSS_SIZE = 17;

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
  {
    ops,
    color,
    size,
    tool,
    showGrid,
    assist,
    pressure,
    disabled,
    previewSize,
    pickingColor,
    onPickColor,
    onDraw,
  },
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
  // The pointer whose stroke, shape, lasso loop or drag is in progress, so a
  // hand resting on the screen can't add its points to a stylus's stroke.
  const owner = useRef<number | null>(null);
  // A stylus touching the canvas. While it is, touches are the hand holding
  // it, and are ignored.
  const stylus = useRef<number | null>(null);
  // The snap assist's timer, and where the finger was when it last started:
  // moving further than HOLD_SLOP from there starts it again.
  const holdTimer = useRef<number | null>(null);
  const holdAnchor = useRef<Finger | null>(null);
  // What a snapped shape does as the finger keeps moving: a line's far end
  // follows it, so it can be swung and stretched; a closed shape stays put.
  const snapped = useRef<"line" | "fixed" | null>(null);
  // The loop being drawn with the lasso, in tile units.
  const lassoLoop = useRef<Point[] | null>(null);
  // A selection being moved (no corner) or resized (by a corner), measured
  // from where the finger and the box were when it started.
  const dragging = useRef<{
    corner: Corner | null;
    origin: Point;
    start: Rect;
  } | null>(null);
  // In state rather than a ref: the Done and Cancel buttons show with it.
  const [floating, setFloating] = useState<Floating | null>(null);
  const [backingSize, setBackingSize] = useState(TILE_SIZE);
  // The canvas's width on screen, for sizing the brush preview.
  const [cssWidth, setCssWidth] = useState(0);
  const [view, setView] = useState<View>(WHOLE_TILE);
  // A mouse moving the view with its right or middle button: where the drag
  // started and the view then. In state as well as a ref for the cursor.
  const panning = useRef<{ origin: Finger; view: View } | null>(null);
  const [grabbing, setGrabbing] = useState(false);
  // Where a mouse or stylus is, for the mark that stands in for the cursor
  // (see placeMark). Moved by writing to the element directly: a re-render
  // per pointer move would redraw the whole drawing.
  const hover = useRef<Hover | null>(null);
  const markRef = useRef<HTMLDivElement>(null);

  // The finished steps, painted once at the current size and zoom and kept.
  // A new step is added to it on its own, so each frame paints this layer
  // plus only what's in progress, rather than the whole drawing again: that
  // grew with every stroke until drawing lagged and then stopped responding.
  const finished = useRef<{
    canvas: HTMLCanvasElement;
    ops: DrawOp[];
    /** The view it was painted at; `null` until its first paint. */
    view: View | null;
  } | null>(null);

  /** The finished-steps layer for `canvas` at `view`, brought up to date. */
  const finishedLayer = useCallback(
    (canvas: HTMLCanvasElement): HTMLCanvasElement | null => {
      let layer = finished.current;
      if (
        !layer ||
        layer.canvas.width !== canvas.width ||
        layer.canvas.height !== canvas.height
      ) {
        const fresh = document.createElement("canvas");
        fresh.width = canvas.width;
        fresh.height = canvas.height;
        layer = { canvas: fresh, ops: [], view: null };
        finished.current = layer;
      }
      const context = layer.canvas.getContext("2d");
      if (!context) return null;

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

      // Only new steps added to the end can go on top of what's there; an
      // undo, a clear or a new zoom paints it all again, once.
      const sameView = layer.view === view;
      const extends_ =
        sameView &&
        ops.length >= layer.ops.length &&
        layer.ops.every((op, index) => ops[index] === op);
      if (!extends_) {
        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
        context.restore();
        paintOps(context, ops);
      } else if (ops.length > layer.ops.length) {
        paintOps(context, ops, layer.ops.length);
      }
      layer.ops = ops;
      layer.view = view;
      return layer.canvas;
    },
    [ops, view],
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const layer = finishedLayer(canvas);

    // The kept layer goes down pixel for pixel; it's already at this zoom.
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (layer) context.drawImage(layer, 0, 0);

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

    paintOverlay(context, { active: active.current, showGrid, floating });

    // Guides for the lasso, in screen pixels: one CSS pixel is this many
    // tile units at the current size and zoom.
    const pixel =
      TILE_SIZE / ((canvas.getBoundingClientRect().width || 1) * view.scale);
    const loop = lassoLoop.current;
    if (loop && loop.length > 1) {
      context.save();
      context.lineWidth = 1.5 * pixel;
      context.strokeStyle = "#111827";
      context.setLineDash([6 * pixel, 4 * pixel]);
      context.beginPath();
      context.moveTo(loop[0][0], loop[0][1]);
      for (const [x, y] of loop.slice(1)) context.lineTo(x, y);
      context.stroke();
      context.restore();
    }
    if (floating) drawSelectionFrame(context, floating.target, pixel);
  }, [finishedLayer, showGrid, view, floating]);

  /** Puts the selection down where it is, unless it was never moved. */
  function putDown(): boolean {
    if (!floating) return false;
    if (!sameRect(floating.source, floating.target)) {
      onDraw({
        kind: "paste",
        hole: floating.hole,
        image: floating.image,
        target: floating.target,
      });
    }
    setFloating(null);
    return true;
  }

  function dropSelection(): boolean {
    if (!floating) return false;
    setFloating(null);
    return true;
  }

  useEffect(redraw, [redraw, backingSize]);

  // While the pen moves, paints are asked for here and happen once per frame:
  // a fast pointer sends moves faster than the screen shows them.
  const pendingFrame = useRef<number | null>(null);
  const latestRedraw = useRef(redraw);
  useEffect(() => {
    latestRedraw.current = redraw;
  }, [redraw]);
  useEffect(
    () => () => {
      if (pendingFrame.current !== null)
        cancelAnimationFrame(pendingFrame.current);
    },
    [],
  );
  function redrawSoon() {
    if (pendingFrame.current !== null) return;
    pendingFrame.current = requestAnimationFrame(() => {
      pendingFrame.current = null;
      latestRedraw.current();
    });
  }

  /**
   * Puts the mark that stands in for the cursor under the pointer (issue
   * #157): a ring the size of the brush for the tools that paint, the same
   * one the eraser has always had, or a crosshair for the ones that act at a
   * point. A finger gets the eraser's ring alone, which shows past the
   * fingertip over the spot being erased; anything else would sit under it.
   */
  const placeMark = useCallback(() => {
    const mark = markRef.current;
    const canvas = canvasRef.current;
    if (!mark || !canvas) return;

    const at = hover.current;
    const kind = pickingColor ? "cross" : markFor(tool);
    if (!at || disabled || grabbing || (at.touch && tool !== "eraser")) {
      if (mark.style.display !== "none") mark.style.display = "none";
      return;
    }
    // One layout read per frame at most: this runs from requestAnimationFrame
    // while the pointer moves, never per event.
    const rect = canvas.getBoundingClientRect();
    const width =
      kind === "ring"
        ? Math.max(brushWidthOnScreen(size, view, rect.width), MIN_RING)
        : CROSS_SIZE;
    const x = at.clientX - rect.left - width / 2;
    const y = at.clientY - rect.top - width / 2;
    mark.dataset.mark = kind;
    mark.style.display = "block";
    mark.style.width = `${width}px`;
    mark.style.height = `${width}px`;
    mark.style.transform = `translate(${x}px, ${y}px)`;
  }, [tool, pickingColor, size, view, disabled, grabbing]);

  // A new size, zoom or tool changes the mark without the pointer moving.
  useEffect(placeMark, [placeMark]);

  // The mark moves at most once a frame, however fast the pointer reports:
  // a stylus can send hundreds of moves a second.
  const markFrame = useRef<number | null>(null);
  const latestPlaceMark = useRef(placeMark);
  useEffect(() => {
    latestPlaceMark.current = placeMark;
  }, [placeMark]);
  useEffect(
    () => () => {
      if (markFrame.current !== null) cancelAnimationFrame(markFrame.current);
    },
    [],
  );

  /**
   * Follows a mouse or stylus, hovering or down, and a finger while it's the
   * only one down. Two fingers are moving the view, so there's nothing to
   * show; a touch that isn't being followed (a palm under a stylus) leaves
   * the mark where it is.
   */
  function trackHover(event: PointerEvent<HTMLCanvasElement>) {
    const touch = event.pointerType === "touch";
    if (
      touch &&
      (!fingers.current.has(event.pointerId) || fingers.current.size > 1)
    ) {
      if (hover.current?.touch) endHover();
      return;
    }
    hover.current = {
      pointerId: event.pointerId,
      touch,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    if (markFrame.current !== null) return;
    markFrame.current = requestAnimationFrame(() => {
      markFrame.current = null;
      latestPlaceMark.current();
    });
  }

  /** Hides the mark, if it was following `pointerId` (or whatever it was). */
  function endHover(pointerId?: number) {
    if (pointerId !== undefined && hover.current?.pointerId !== pointerId) {
      return;
    }
    hover.current = null;
    placeMark();
  }

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
        setCssWidth(width);
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
        // is a way of looking at the drawing, not part of it. A selection
        // still being moved is posted where it is, as it's shown.
        const drawn: DrawOp[] = floating
          ? [...ops, { kind: "paste", ...floating }]
          : ops;
        renderTile(drawn).toBlob(
          (blob) =>
            blob ? resolve(blob) : reject(new Error("Canvas export failed")),
          "image/png",
        );
      }),
    commitSelection: putDown,
    cancelSelection: dropSelection,
  }));

  /** How many tile units one CSS pixel covers at the canvas's size and zoom. */
  function pixelSize(rect: DOMRect): number {
    return TILE_SIZE / ((rect.width || 1) * view.scale);
  }

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

  /** Throws away whatever was being drawn, looped or dragged. */
  function dropInProgress() {
    active.current = null;
    lassoLoop.current = null;
    dragging.current = null;
    owner.current = null;
    cancelHold();
    holdAnchor.current = null;
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const role = pointerRole(event, stylus.current !== null);
    if (role === "ignore") return;
    if (role === "stylus" || role === "fresh") {
      // Anything still remembered is a palm that landed first, or a finger
      // whose lift was never reported: neither should draw or pinch with
      // this one.
      if (fingers.current.size > 0) {
        fingers.current.clear();
        gesture.current = null;
        dropInProgress();
        redrawSoon();
      }
      if (role === "stylus") stylus.current = event.pointerId;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // A pointer can be gone by the time this runs, and capturing is only an
      // improvement: without it a stroke ends when the finger leaves the
      // canvas, which is survivable.
    }
    const finger = fingerAt(event, rect);

    if (event.pointerType === "mouse" && event.button !== 0) {
      // A right or middle button drags the view instead of drawing: a mouse
      // has no second finger to move a zoomed-in tile with.
      panning.current = { origin: finger, view };
      setGrabbing(true);
      return;
    }

    if (pickingColor && onPickColor) {
      const [x, y] = toTilePoint(event, rect);
      onPickColor(colorAt(ops, x, y));
      return;
    }

    fingers.current.set(event.pointerId, finger);
    trackHover(event);
    cancelHold();
    holdAnchor.current = null;
    snapped.current = null;
    // Only the pointer that starts something moves it on and finishes it.
    owner.current = event.pointerId;

    if (fingers.current.size >= 2) {
      // A second finger means they're moving the drawing, not drawing on it.
      // Whatever the first one had started is thrown away rather than left as
      // an accidental dot. A half-drawn lasso loop or a drag goes the same way;
      // a selection already lifted stays lifted.
      dropInProgress();
      const [first, second] = [...fingers.current.values()];
      gesture.current = {
        distance: distanceBetween(first, second),
        midpoint: midpointOf(first, second),
        view,
      };
      redraw();
      return;
    }

    if (tool === "lasso") {
      const [x, y] = toTilePoint(event, rect);
      const point: Point = [x, y];
      if (floating) {
        const corner = handleAt(
          floating.target,
          point,
          HANDLE_REACH * pixelSize(rect),
        );
        if (corner !== null || contains(floating.target, point)) {
          dragging.current = { corner, origin: point, start: floating.target };
          return;
        }
        // A touch outside the selection puts it down and starts a new loop.
        putDown();
      }
      lassoLoop.current = [point];
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
      even: tool === "pen" && !pressure,
    };
    // Spray is meant to be rough, and a straightened eraser line is not
    // something anyone reaches for, so only pen and marker snap.
    if (assist && (tool === "pen" || tool === "marker")) startHold(finger);
    redraw();
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    trackHover(event);
    const pan = panning.current;
    if (pan) {
      const rect = event.currentTarget.getBoundingClientRect();
      const finger = fingerAt(event, rect);
      setView(
        panBy(
          pan.view,
          finger.x - pan.origin.x,
          finger.y - pan.origin.y,
          rect.width,
        ),
      );
      return;
    }

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
      setView(
        panBy(
          zoomed,
          midpoint.x - start.midpoint.x,
          midpoint.y - start.midpoint.y,
          rect.width,
        ),
      );
      return;
    }
    if (owner.current !== event.pointerId) return;

    const drag = dragging.current;
    if (drag) {
      const [x, y] = toTilePoint(event, rect);
      const target =
        drag.corner === null
          ? moveBy(drag.start, x - drag.origin[0], y - drag.origin[1])
          : resizeFromCorner(drag.start, drag.corner, [x, y]);
      setFloating((current) => current && { ...current, target });
      return;
    }

    const loop = lassoLoop.current;
    if (loop) {
      const [x, y] = toTilePoint(event, rect);
      loop.push([x, y]);
      redrawSoon();
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
        keepsPerfect(drawing.shape, event.shiftKey),
      );
      redrawSoon();
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
    redrawSoon();
  }

  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === "touch") endHover(event.pointerId);
    if (panning.current) {
      panning.current = null;
      setGrabbing(false);
      return;
    }

    // A palm that was ignored, or the colour picker's tap, has nothing to end.
    if (!fingers.current.delete(event.pointerId)) return;
    if (stylus.current === event.pointerId) stylus.current = null;
    if (fingers.current.size < 2) gesture.current = null;
    // A second finger already threw away what the first one started, so only
    // the pointer that started something finishes it.
    if (owner.current !== event.pointerId) return;
    owner.current = null;
    cancelHold();
    holdAnchor.current = null;

    if (dragging.current) {
      dragging.current = null;
      return;
    }

    const loop = lassoLoop.current;
    if (loop) {
      lassoLoop.current = null;
      const lifted = liftSelection(ops, loop);
      if (lifted) setFloating({ ...lifted, source: lifted.target });
      else redraw();
      return;
    }

    const drawing = active.current;
    if (!drawing) return;
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

  /**
   * Back to the whole tile. Whatever pinch or drag was moving the view is
   * forgotten too, so a finger still on the canvas can't carry on from the
   * zoom it started at.
   */
  function fitWholeTile() {
    gesture.current = null;
    if (panning.current) {
      panning.current = null;
      setGrabbing(false);
    }
    setView(WHOLE_TILE);
  }

  // Safari on an iPad can act on a stylus's touches whatever `touch-action`
  // says: two quick taps zoom the page, and a press held still can start a
  // text selection, either of which stalls the stroke under way. The pointer
  // events the drawing uses have been sent by then, so cancelling the
  // touches costs it nothing. Fingers are left to `touch-action`.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleTouch(event: TouchEvent) {
      const fromStylus = Array.from(event.changedTouches).some(
        (touch) =>
          (touch as Touch & { touchType?: string }).touchType === "stylus",
      );
      if (fromStylus && event.cancelable) event.preventDefault();
    }

    const options = { passive: false };
    for (const type of ["touchstart", "touchmove", "touchend"] as const) {
      canvas.addEventListener(type, handleTouch, options);
    }
    return () => {
      for (const type of ["touchstart", "touchmove", "touchend"] as const) {
        canvas.removeEventListener(type, handleTouch);
      }
    };
  }, []);

  // Zooming with a wheel, for anyone drawing with a mouse or trackpad. React
  // listens for wheel events passively, so its onWheel can't stop the page
  // scrolling (or, for a trackpad pinch, zooming) at the same time and the
  // tile slides out from under the pointer; a listener of our own can.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || disabled) return;

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = canvas!.getBoundingClientRect();
      const factor = Math.exp(-event.deltaY / 300);
      setView((current) =>
        zoomAround(
          current,
          current.scale * factor,
          event.clientX - rect.left,
          event.clientY - rect.top,
          rect.width,
        ),
      );
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [disabled]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={backingSize}
        height={backingSize}
        aria-label="Drawing area"
        // Stops the page scrolling or zooming while a finger is on the tile;
        // pinching is handled here instead. A long press selects nothing and
        // brings up no menu.
        className="border-foreground aspect-square w-full touch-none rounded-xl border-2 bg-white shadow-[4px_4px_0_var(--primary)] select-none [-webkit-touch-callout:none]"
        // The mark below is the cursor while drawing.
        style={{
          cursor: grabbing ? "grabbing" : disabled ? "default" : "none",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={(event) => endHover(event.pointerId)}
        // The right button moves the view, so its menu would only get in the way.
        onContextMenu={(event) => event.preventDefault()}
      />

      {/* Where the pointer is and, for a brush, how much it covers: the
          cursor over the drawing (see placeMark, and .draw-mark in
          globals.css). */}
      <div ref={markRef} aria-hidden className="draw-mark" />

      {previewSize && cssWidth > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/70 shadow-[0_0_0_1px_rgba(255,255,255,0.9)]"
          style={{
            width: brushWidthOnScreen(size, view, cssWidth),
            height: brushWidthOnScreen(size, view, cssWidth),
            // The eraser is the paper's colour, so it shows as a ring alone.
            background: tool === "eraser" ? "transparent" : color,
          }}
        />
      )}

      {/* Which tool is in hand, on touch screens, where the toolbar can be
          scrolled out of sight; a mouse shows it with the cursor. */}
      <p className="bg-secondary text-primary pointer-events-none absolute top-2 right-2 hidden rounded-full px-2.5 py-1 text-xs font-semibold pointer-coarse:block">
        {toolName(tool)}
      </p>

      {view.scale > 1 && !floating && (
        // Only where there's a mouse: on a touch screen two fingers move it.
        <p className="bg-secondary text-primary pointer-events-none absolute top-2 left-2 hidden rounded-full px-2.5 py-1 text-xs font-semibold pointer-fine:block">
          Right-click and drag to move
        </p>
      )}

      {view.scale > 1 && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          // No double-tap zoom: tapping it twice should not zoom the page.
          className="absolute right-2 bottom-2 touch-manipulation shadow-md"
          onClick={fitWholeTile}
          onPointerUp={(event) => {
            if (
              pressedByLift(event, event.currentTarget.getBoundingClientRect())
            ) {
              fitWholeTile();
            }
          }}
        >
          {view.scale.toFixed(1)}× · Fit
        </Button>
      )}

      {floating && (
        <div className="absolute bottom-2 left-2 flex gap-2">
          <Button
            type="button"
            size="sm"
            className="shadow-md"
            onClick={putDown}
          >
            Done
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shadow-md"
            onClick={dropSelection}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
});
