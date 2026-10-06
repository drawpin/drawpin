"use client";

import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  CircleIcon,
  EraserIcon,
  EyedropperIcon,
  HighlighterIcon,
  type Icon,
  LassoIcon,
  LineSegmentIcon,
  PaintBucketIcon,
  PenIcon,
  ShapesIcon,
  SprayBottleIcon,
  SquareIcon,
} from "@phosphor-icons/react";
import { signInWithGoogle } from "@/app/auth/sign-in";
import { Button } from "@/components/ui/button";
import { hand } from "@/lib/fonts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeviceFingerprintField } from "@/components/device-fingerprint";
import { Turnstile } from "@/components/turnstile";
import { TURNSTILE_FIELD } from "@/lib/turnstile/field";
import { postTileAction } from "./actions";
import {
  DrawingCanvas,
  type DrawOp,
  type DrawingCanvasHandle,
} from "./drawing-canvas";
import { ColorPanel } from "./color-panel";
import { BASE_COLORS, parseRecents, withRecent } from "./palette";
import type { Brush } from "./render";
import type { PostTileState } from "./schema";
import { type ShapeKind, SHAPES } from "./shapes";
import { historyShortcut, isTypingTarget } from "./shortcuts";
import { saveDraft, takeDraft } from "./draft";
import { GuestPostButton } from "./guest-post-button";
import { DrawSettings } from "./draw-settings";
import { ClearButton } from "./clear-button";
import { SizePopout } from "./size-popout";
import { hasUnsavedDrawing, setUnsavedDrawing } from "./unsaved-drawing";
import { type RailTool, ToolRail } from "./tool-rail";
import { BRUSHES, isShapeTool, type Tool } from "./tools";

const BRUSH_TIPS: Record<Brush, string> = {
  pen: "Follows your finger. With Snap on, hold still at the end of a line to straighten it.",
  marker:
    "Even and a little see-through, so crossing lines darken where they meet.",
  spray: "A soft scatter of dots. Go over a spot again to build it up.",
  eraser: "Paints the paper back. The size slider sets how wide.",
};

const BRUSH_ICONS: Record<Brush, Icon> = {
  pen: PenIcon,
  marker: HighlighterIcon,
  spray: SprayBottleIcon,
  eraser: EraserIcon,
};

/**
 * The rail, top to bottom: what you draw with, then what else a finger can
 * do. A second tap on any of them shows how to use it. Picking Shapes also
 * pops out Line, Circle and Square, which go away once one is chosen.
 */
const RAIL_TOOLS: RailTool[] = [
  ...BRUSHES.map((option) => ({
    id: option.value,
    label: option.name,
    icon: BRUSH_ICONS[option.value],
    tip: BRUSH_TIPS[option.value],
  })),
  {
    id: "fill",
    label: "Fill",
    icon: PaintBucketIcon,
    tip: "Tap an area to fill it with the colour in hand.",
  },
  {
    id: "shapes",
    label: "Shapes",
    icon: ShapesIcon,
    tip: "Pick a shape, then drag to draw it. Hold Shift with a mouse for a perfect circle or square.",
    optionsOnPick: true,
  },
  {
    id: "lasso",
    label: "Lasso",
    icon: LassoIcon,
    tip: "Draw a loop round part of your drawing, then drag it or its corners.",
  },
];

const SHAPE_ICONS: Record<ShapeKind, Icon> = {
  line: LineSegmentIcon,
  ellipse: CircleIcon,
  rectangle: SquareIcon,
};

/** An on/off button that's on: the primary blue on the tint. */
const PRESSED =
  "aria-pressed:border-primary aria-pressed:bg-secondary aria-pressed:text-primary";

/**
 * A colour swatch: a circle as wide as its grid column, about 39px on a
 * phone, where eight of them share a row. An invisible 4px band around it
 * (`after:`) takes the tap area to about 46px without making the circle
 * bigger (measured: the row below trims a pixel off the bottom edge);
 * the bands overlap their neighbours' by a pixel or two, which a thumb never
 * notices. The ring shows which colour is in hand. Picked constantly, so it
 * only answers the tap: a small squeeze, and a grow under a mouse.
 */
const SWATCH =
  "relative after:absolute after:-inset-[4px] after:rounded-full after:content-[''] border-border focus-visible:ring-highlight aria-pressed:ring-primary aspect-square w-full max-w-12 cursor-pointer justify-self-center rounded-full border outline-none transition-transform duration-150 ease-out hover:scale-110 focus-visible:ring-3 active:scale-90 aria-pressed:ring-2 aria-pressed:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100";

/** What a tap on Post with nothing drawn says: an invitation, not a scolding. */
const BLANK_NUDGE = "Nothing drawn yet. Draw something, then post it.";

/** The colour a step puts on the tile, if it adds one: the eraser doesn't. */
function inkOf(op: DrawOp): string | null {
  if (op.kind === "stroke") return op.brush === "eraser" ? null : op.color;
  if (op.kind === "shape" || op.kind === "fill") return op.color;
  return null;
}

/** Brush sizes in tile units, so they mean the same on any screen. */
const MIN_SIZE = 4;
const MAX_SIZE = 64;
const DEFAULT_SIZE = 18;

const BRUSH_STORAGE_KEY = "drawpin:brush";
const SIZE_STORAGE_KEY = "drawpin:brush-size";
const ERASER_SIZE_STORAGE_KEY = "drawpin:eraser-size";
/** Erasing is usually coarser work than drawing, so it starts bigger. */
const DEFAULT_ERASER_SIZE = 36;

const COLOR_STORAGE_KEY = "drawpin:brush-color";
const RECENTS_STORAGE_KEY = "drawpin:recent-colors";
const GRID_STORAGE_KEY = "drawpin:show-grid";
const ASSIST_STORAGE_KEY = "drawpin:snap-assist";
const PRESSURE_STORAGE_KEY = "drawpin:pen-pressure";

const initialState: PostTileState = { status: "idle" };

/** The guest's sign-in form, outside the drawing's form. */
const SIGN_IN_FORM_ID = "draw-sign-in";

/** How long the brush stays shown on the canvas after its size last changed. */
const SIZE_PREVIEW_MS = 800;

const subscribeToNothing = () => () => {};

/**
 * A value saved from a previous drawing, or `null` on the server and before
 * hydration. Nothing here is important enough to survive private browsing
 * refusing to store it.
 */
function useStored(key: string): string | null {
  return useSyncExternalStore(
    subscribeToNothing,
    () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
}

/** `false` in the server HTML, `true` once React has hydrated in the browser. */
function useHydrated() {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

export function DrawTileForm({
  slug,
  turnstileSiteKey,
  username,
}: {
  slug: string;
  turnstileSiteKey: string;
  /**
   * The signed-in customer's name, or `null` for a guest, who can draw as
   * much as they like but can't post (ADR-007).
   */
  username: string | null;
}) {
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  // Before hydration the submit handler isn't attached, so a tap would do a
  // plain GET submit: the drawing is lost and the caption lands in the URL.
  const hydrated = useHydrated();
  const [state, formAction, pending] = useActionState(
    postTileAction,
    initialState,
  );
  const [ops, setOps] = useState<DrawOp[]>([]);
  // A tool used instead of the brush, if any. Only the brush is remembered
  // between visits: someone coming back should start drawing, not find
  // themselves in bucket or shape mode wondering why nothing draws.
  const [pickedMode, setMode] = useState<"fill" | "lasso" | ShapeKind | null>(
    null,
  );
  // The shape the Shapes button returns to.
  const [lastShape, setLastShape] = useState<ShapeKind>("line");
  // What they used last time, read the same way the hydration flag is: the
  // server has no storage, so its snapshot is null and the first client
  // render matches the HTML it's hydrating.
  const storedBrush = useStored(BRUSH_STORAGE_KEY);
  const storedColor = useStored(COLOR_STORAGE_KEY);
  const storedRecents = useStored(RECENTS_STORAGE_KEY);
  const storedSize = Number(useStored(SIZE_STORAGE_KEY));
  const storedEraserSize = Number(useStored(ERASER_SIZE_STORAGE_KEY));
  const storedGrid = useStored(GRID_STORAGE_KEY);
  const storedAssist = useStored(ASSIST_STORAGE_KEY);
  const storedPressure = useStored(PRESSURE_STORAGE_KEY);

  const [pickedBrush, setBrush] = useState<Brush | null>(null);
  const [pickedColor, setColor] = useState<string | null>(null);
  const [pickedRecents, setRecents] = useState<string[] | null>(null);
  // The colour panel, opened from Make a colour in Your colours.
  const [panelOpen, setPanelOpen] = useState(false);
  // The colour picker: armed, the next tap on the drawing takes its colour.
  const [pickingColor, setPickingColor] = useState(false);
  const [pickedSize, setSize] = useState<number | null>(null);
  const [pickedEraserSize, setEraserSize] = useState<number | null>(null);
  const [pickedGrid, setShowGrid] = useState<boolean | null>(null);
  const [pickedAssist, setAssist] = useState<boolean | null>(null);
  const [pickedPressure, setPressure] = useState<boolean | null>(null);

  const brush =
    pickedBrush ??
    (BRUSHES.some((option) => option.value === storedBrush)
      ? (storedBrush as Brush)
      : "pen");
  const tool: Tool = pickedMode ?? brush;
  const color = pickedColor ?? storedColor ?? BASE_COLORS[0].value;
  const recents = pickedRecents ?? parseRecents(storedRecents);
  const isErasing = tool === "eraser";

  // The eraser keeps its own size: switching to it to rub something out
  // shouldn't cost you the brush size you'd settled on.
  const brushSize =
    pickedSize ??
    (storedSize >= MIN_SIZE && storedSize <= MAX_SIZE
      ? storedSize
      : DEFAULT_SIZE);
  const eraserSize =
    pickedEraserSize ??
    (storedEraserSize >= MIN_SIZE && storedEraserSize <= MAX_SIZE
      ? storedEraserSize
      : DEFAULT_ERASER_SIZE);
  const size = isErasing ? eraserSize : brushSize;
  const showGrid = pickedGrid ?? storedGrid === "true";
  // Off until someone turns it on: a pause mid-stroke would otherwise snap a
  // drawing that was never meant to be a shape.
  const assist = pickedAssist ?? storedAssist === "true";
  // Off by default, so the pen draws the same even line on every device;
  // on, it follows a stylus's pressure, or the speed of a finger or mouse.
  const pressure = pickedPressure ?? storedPressure === "true";
  // Things undone but not yet replaced, newest last.
  const [undone, setUndone] = useState<DrawOp[]>([]);
  // Drawing comes first and alone; who you are and what to call it are asked
  // once there's something to post.
  const [step, setStep] = useState<"drawing" | "details">("drawing");
  // Shows the brush on the canvas while its size changes, and for a moment
  // after, so a tap on the slider is seen too.
  const [previewingSize, setPreviewingSize] = useState(false);
  const previewTimer = useRef<number | null>(null);

  function previewSize() {
    setPreviewingSize(true);
    if (previewTimer.current !== null) clearTimeout(previewTimer.current);
    previewTimer.current = window.setTimeout(
      () => setPreviewingSize(false),
      SIZE_PREVIEW_MS,
    );
  }

  useEffect(() => {
    const timer = previewTimer;
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);
  const [localError, setLocalError] = useState<string | null>(null);
  // Tapping Post with nothing drawn: a nudge, not an error. It goes for good
  // as soon as there is something on the tile: erasing back to blank doesn't
  // bring it back, only another try at posting a blank tile does. Counts the
  // tries (0 is hidden), so the note pops in again on each one.
  const [blankTries, setBlankTries] = useState(0);
  if (blankTries > 0 && ops.length > 0) setBlankTries(0);
  const nudgeBlank = () => setBlankTries((tries) => tries + 1);
  // Set when a drawing kept across sign-in has just been put back.
  const [restored, setRestored] = useState(false);
  const canvasRef = useRef<DrawingCanvasHandle>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (ops.length === 0) {
      nudgeBlank();
      return;
    }

    const formData = new FormData(event.currentTarget);
    try {
      const image = await canvasRef.current!.toBlob();
      formData.set("image", image, "tile.png");
    } catch {
      setLocalError("We couldn't read your drawing. Try again.");
      return;
    }

    startTransition(() => formAction(formData));
  }

  /** Remembers a choice so the next drawing starts where this one left off. */
  function remember(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Private browsing refuses to store anything; the drawing still works.
    }
  }

  /** Uses a colour without adding it to Recent: the panel sends one per drag step. */
  function previewColor(next: string) {
    setColor(next);
    remember(COLOR_STORAGE_KEY, next);
  }

  function addRecent(next: string) {
    const updated = withRecent(recents, next);
    setRecents(updated);
    remember(RECENTS_STORAGE_KEY, JSON.stringify(updated));
  }

  /** A default or one of your colours: used straight away. */
  function chooseColor(next: string) {
    previewColor(next);
    setPanelOpen(false);
  }

  function openPanel() {
    setPanelOpen(true);
  }

  /** Closing the panel settles whatever it was left on into Recent. */
  function closePanel() {
    setPanelOpen(false);
  }

  function addOp(op: DrawOp) {
    // A colour joins Your colours the moment it's drawn with, not when it's
    // tried in the panel: only what ends up on a tile is worth keeping. A
    // default never joins (palette.ts), and drawing with one of your colours
    // again moves it to the front.
    const ink = inkOf(op);
    if (ink) addRecent(ink);
    setOps((current) => [...current, op]);
    // Doing something new is a new branch: what was undone can't come back.
    setUndone([]);
  }

  /**
   * Changes tool, putting a lasso selection down first: switching away
   * shouldn't throw away a move someone has lined up.
   */
  function switchTool(change: () => void) {
    canvasRef.current?.commitSelection();
    change();
  }

  /** A tool from the rail: a brush is remembered; the others are for now. */
  function pickTool(id: string) {
    switchTool(() => {
      if (id === "fill" || id === "lasso") {
        setMode(id);
      } else if (id === "shapes") {
        setMode(lastShape);
      } else {
        setBrush(id as Brush);
        setMode(null);
        remember(BRUSH_STORAGE_KEY, id);
      }
    });
  }

  // Stable, so the keyboard shortcuts below don't re-subscribe every render.
  const undo = useCallback(() => {
    // A selection still being moved is the most recent thing: undoing puts
    // it back where it came from, before touching anything drawn.
    if (canvasRef.current?.cancelSelection()) return;
    setOps((current) => {
      const last = current.at(-1);
      if (last) setUndone((redoable) => [...redoable, last]);
      return current.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setUndone((current) => {
      const last = current.at(-1);
      if (last) setOps((drawn) => [...drawn, last]);
      return current.slice(0, -1);
    });
  }, []);

  // A drawing kept for the trip to sign in (draft.ts) comes back once. Read
  // after hydration: storage only exists in the browser, and the server
  // renders an empty canvas.
  useEffect(() => {
    const draft = takeDraft(slug);
    if (!draft) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring from browser storage, which the server render can't see
    setOps(draft);
    setRestored(true);
  }, [slug]);

  // Whether there's a drawing to lose: the back button asks before leaving
  // (back-to-board.tsx), and the browser warns before a reload or closing the
  // tab. Leaving the page drops it, so nothing is left behind.
  useEffect(() => {
    setUnsavedDrawing(ops.length > 0);
  }, [ops.length]);

  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (!hasUnsavedDrawing()) return;
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      setUnsavedDrawing(false);
    };
  }, []);

  // Ctrl/Cmd+Z and friends, while drawing. The details step has the name and
  // caption fields, where those keys belong to the text being typed.
  useEffect(() => {
    if (step !== "drawing" || pending) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;
      const action = historyShortcut(event);
      if (!action) return;

      // Otherwise the browser runs its own undo on whatever has focus.
      event.preventDefault();
      if (action === "undo") undo();
      else redo();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step, pending, undo, redo]);

  function goToDetails() {
    canvasRef.current?.commitSelection();
    closePanel();
    if (ops.length === 0) {
      nudgeBlank();
      return;
    }
    setLocalError(null);
    setStep("details");
  }

  const error = localError ?? (state.status === "error" ? state.message : null);

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input type="hidden" name="slug" value={slug} />
        <input
          type="hidden"
          name={TURNSTILE_FIELD}
          value={turnstileToken ?? ""}
        />
        <DeviceFingerprintField />

        {step === "drawing" && (
          // Undo, redo, clear and the settings, over the canvas's right edge.
          <div className="-mb-2 flex items-center justify-end gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={pending || ops.length === 0}
              onClick={undo}
              title="Undo (Ctrl+Z)"
              aria-keyshortcuts="Control+Z Meta+Z"
              aria-label="Undo"
            >
              <ArrowCounterClockwiseIcon weight="bold" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={pending || undone.length === 0}
              onClick={redo}
              title="Redo (Ctrl+Shift+Z)"
              aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
              aria-label="Redo"
            >
              <ArrowClockwiseIcon weight="bold" />
            </Button>
            <ClearButton
              disabled={pending || ops.length === 0}
              onClear={() => {
                canvasRef.current?.cancelSelection();
                setOps([]);
                setUndone([]);
              }}
            />
            {/* How drawing behaves, in one place: Snap and Pressure together,
                with the grid. */}
            <DrawSettings
              disabled={pending}
              settings={[
                {
                  id: "snap",
                  label: "Snap",
                  hint: "Hold still at the end of a line or shape to snap it perfect.",
                  on: assist,
                  onChange: (next) => {
                    setAssist(next);
                    remember(ASSIST_STORAGE_KEY, String(next));
                  },
                },
                {
                  id: "pressure",
                  label: "Pen pressure",
                  hint: "The pen's width follows how hard you press, or how fast you draw.",
                  on: pressure,
                  onChange: (next) => {
                    setPressure(next);
                    remember(PRESSURE_STORAGE_KEY, String(next));
                  },
                },
                {
                  id: "grid",
                  label: "Grid",
                  hint: "A guide on the canvas. It isn't part of the drawing.",
                  on: showGrid,
                  onChange: (next) => {
                    setShowGrid(next);
                    remember(GRID_STORAGE_KEY, String(next));
                  },
                },
              ]}
            />
          </div>
        )}

        {/* The tools in a rail beside the canvas while drawing; the details
            step shows the tile on its own, as the board will. */}
        <div
          className={
            step === "drawing"
              ? "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5"
              : undefined
          }
        >
          {step === "drawing" && (
            <ToolRail
              tools={RAIL_TOOLS}
              disabled={pending}
              isActive={(id) =>
                id === "shapes" ? isShapeTool(tool) : tool === id
              }
              onPick={pickTool}
              footer={
                // One size for whichever tool is in hand; the eraser keeps its
                // own, so rubbing something out doesn't cost the brush size.
                <SizePopout
                  size={size}
                  min={MIN_SIZE}
                  max={MAX_SIZE}
                  color={isErasing ? null : color}
                  label={isErasing ? "Eraser size" : "Brush size"}
                  disabled={pending}
                  onChange={(next) => {
                    previewSize();
                    if (isErasing) {
                      setEraserSize(next);
                      remember(ERASER_SIZE_STORAGE_KEY, String(next));
                    } else {
                      setSize(next);
                      remember(SIZE_STORAGE_KEY, String(next));
                    }
                  }}
                />
              }
              options={(id, close) =>
                id === "shapes" ? (
                  <fieldset className="flex gap-1.5" disabled={pending}>
                    <legend className="sr-only">Shape</legend>
                    {SHAPES.map((option) => {
                      const ShapeIcon = SHAPE_ICONS[option.value];
                      return (
                        <Button
                          key={option.value}
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={option.name}
                          title={option.name}
                          aria-pressed={tool === option.value}
                          className={PRESSED}
                          onClick={() => {
                            setMode(option.value);
                            setLastShape(option.value);
                            close();
                          }}
                        >
                          <ShapeIcon />
                        </Button>
                      );
                    })}
                  </fieldset>
                ) : null
              }
            />
          )}
          <DrawingCanvas
            ref={canvasRef}
            ops={ops}
            color={color}
            size={size}
            tool={tool}
            // The guide is for drawing; the details step is a last look at the
            // tile as the board will show it.
            showGrid={showGrid && step === "drawing"}
            assist={assist}
            pressure={pressure}
            disabled={pending}
            previewSize={previewingSize}
            pickingColor={pickingColor}
            onPickColor={(picked) => {
              chooseColor(picked);
              setPickingColor(false);
            }}
            onDraw={addOp}
          />
        </div>

        {step === "drawing" ? (
          <>
            {/* Your colours: the creator, then the colours you've mixed with
                it. Always here, so the creator is always in the same place;
                its panel opens right under this row. Then the colour picker,
                the other way to get a colour that isn't a default. */}
            <fieldset disabled={pending}>
              <legend className="text-muted-foreground mb-1.5 text-sm">
                Your colours
              </legend>
              <div className="grid grid-cols-8 gap-1">
                {/* Drawn as a wheel so it reads as "any colour". */}
                <button
                  type="button"
                  aria-label="Make a colour"
                  title="Make a colour"
                  aria-expanded={panelOpen}
                  onClick={() => (panelOpen ? closePanel() : openPanel())}
                  className={`${SWATCH} aria-expanded:ring-primary aria-expanded:ring-2 aria-expanded:ring-offset-2`}
                  style={{
                    background:
                      "conic-gradient(#ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)",
                  }}
                />
                <button
                  type="button"
                  aria-label="Pick a colour from your drawing"
                  title="Pick a colour from your drawing"
                  aria-pressed={pickingColor}
                  disabled={ops.length === 0}
                  onClick={() => {
                    setPanelOpen(false);
                    setPickingColor((armed) => !armed);
                  }}
                  className={`${SWATCH} bg-background text-foreground aria-pressed:bg-secondary aria-pressed:text-primary grid place-items-center disabled:cursor-default disabled:opacity-40 [&_svg]:size-5`}
                >
                  <EyedropperIcon aria-hidden />
                </button>
                {recents.map((recent) => (
                  <button
                    key={recent}
                    type="button"
                    aria-label={`Your colour ${recent}`}
                    aria-pressed={color === recent}
                    onClick={() => chooseColor(recent)}
                    className={SWATCH}
                    style={{ backgroundColor: recent }}
                  />
                ))}
              </div>
            </fieldset>

            {pickingColor && (
              <p
                role="status"
                className="bg-secondary text-secondary-foreground flex items-center gap-2 rounded-2xl px-4 py-3 text-sm"
              >
                <EyedropperIcon aria-hidden className="text-primary size-5" />
                Tap your drawing to pick a colour.
              </p>
            )}

            {panelOpen && (
              <div className="motion-safe:animate-fade-up">
                <ColorPanel color={color} onChange={previewColor} />
              </div>
            )}

            {/* The defaults, the same eight every time. */}
            <fieldset disabled={pending}>
              <legend className="text-muted-foreground mb-1.5 text-sm">
                Colours
              </legend>
              <div className="grid grid-cols-8 gap-1">
                {BASE_COLORS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-label={option.name}
                    aria-pressed={color === option.value}
                    onClick={() => chooseColor(option.value)}
                    className={SWATCH}
                    style={{ backgroundColor: option.value }}
                  />
                ))}
              </div>
            </fieldset>

            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}

            {blankTries > 0 && (
              // A strip of yellow paper, like the board's heading (chosen
              // from prototypes on 2026-10-02); `nudge-note` pops it in.
              <p
                key={blankTries}
                role="status"
                className={`${hand.className} nudge-note bg-winner text-foreground w-fit -rotate-2 px-4 pt-1 pb-0.5 text-2xl leading-tight font-bold shadow-[0_2px_3px_rgb(15_27_45/0.18),0_6px_12px_rgb(15_27_45/0.14)]`}
              >
                {BLANK_NUDGE}
              </p>
            )}

            {restored && username && (
              <p
                role="status"
                className="bg-secondary motion-safe:animate-fade-up rounded-2xl px-4 py-3 text-sm"
              >
                Your drawing&apos;s back. Post it when you&apos;re ready.
              </p>
            )}

            {username ? (
              // Nothing is asked about the drawing until there is one.
              <Button
                type="button"
                size="lg"
                className="w-full"
                disabled={!hydrated || pending}
                onClick={goToDetails}
              >
                Post my tile
              </Button>
            ) : (
              // A guest can't post: the button turns into sign-in, and the
              // drawing is kept for the trip (draft.ts).
              <GuestPostButton
                formId={SIGN_IN_FORM_ID}
                disabled={!hydrated || pending}
                onAsk={() => {
                  if (ops.length === 0) {
                    nudgeBlank();
                    return false;
                  }
                  setLocalError(null);
                  // A selection still being moved goes down where it is, so it's
                  // part of what's kept.
                  canvasRef.current?.commitSelection();
                  return true;
                }}
                onSignIn={() => {
                  saveDraft(slug, ops);
                  setUnsavedDrawing(false);
                }}
              />
            )}
          </>
        ) : (
          <>
            {/* The tile goes up under the name on their account, so there's
              nothing to ask and nothing to type. */}
            <p className="text-muted-foreground text-sm">
              Posting as <span className="font-medium">{username}</span>
            </p>

            <div className="flex flex-col gap-2">
              <Label htmlFor="caption">Caption (optional)</Label>
              <Input id="caption" name="caption" maxLength={80} />
            </div>

            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}

            <Turnstile siteKey={turnstileSiteKey} onToken={setTurnstileToken} />

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={!hydrated || pending || !turnstileToken}
            >
              {/* Checking the drawing is most of the wait, and a second or two
                of "Posting…" looks frozen; saying what's happening doesn't. */}
              {pending
                ? "Checking your drawing…"
                : turnstileToken
                  ? "Post my tile"
                  : "Checking your browser…"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => setStep("drawing")}
            >
              Back to drawing
            </Button>
          </>
        )}
      </form>
      {/* Outside the drawing's form, which can't contain another one; the
        guest's Post button submits it through its form attribute. */}
      {!username && (
        <form id={SIGN_IN_FORM_ID} action={signInWithGoogle} hidden>
          <input type="hidden" name="next" value={`/b/${slug}/draw`} />
        </form>
      )}
    </>
  );
}
