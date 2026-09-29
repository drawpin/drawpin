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
  GridFourIcon,
  HighlighterIcon,
  type Icon,
  LassoIcon,
  LineSegmentIcon,
  MagnetIcon,
  PaintBucketIcon,
  PenIcon,
  ShapesIcon,
  SprayBottleIcon,
  SquareIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { signInWithGoogle } from "@/app/auth/sign-in";
import { Button } from "@/components/ui/button";
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
import { ToolButton } from "./tool-button";
import { BRUSHES, isShapeTool, type Tool } from "./tools";

const BRUSH_ICONS: Record<Brush, Icon> = {
  pen: PenIcon,
  marker: HighlighterIcon,
  spray: SprayBottleIcon,
  eraser: EraserIcon,
};

const SHAPE_ICONS: Record<ShapeKind, Icon> = {
  line: LineSegmentIcon,
  ellipse: CircleIcon,
  rectangle: SquareIcon,
};

/** An on/off button that's on: the primary blue on the tint. */
const PRESSED =
  "aria-pressed:border-primary aria-pressed:bg-secondary aria-pressed:text-primary";

/**
 * A colour swatch: a circle as wide as its grid column, at least 44px on a
 * 375px phone. The ring shows which colour is in hand. Picked constantly, so
 * it only answers the tap: a small squeeze, and a grow under a mouse.
 */
const SWATCH =
  "border-border focus-visible:ring-highlight aria-pressed:ring-primary aspect-square w-full max-w-12 cursor-pointer justify-self-center rounded-full border outline-none transition-transform duration-150 ease-out hover:scale-110 focus-visible:ring-3 active:scale-90 aria-pressed:ring-2 aria-pressed:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100";

/** The brush size as a dot in the brush's colour, or an outline for the eraser. */
function SizeDot({ size, color }: { size: number; color: string | null }) {
  const diameter = Math.min(Math.max(size / 2.5, 4), 22);
  return (
    <span
      aria-hidden
      className="border-foreground/40 rounded-full border"
      style={{
        width: diameter,
        height: diameter,
        backgroundColor: color ?? "transparent",
      }}
    />
  );
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
  // The colour panel, and the colour it opened on — what it's left on is only
  // added to Recent if it differs.
  const [panelOpen, setPanelOpen] = useState(false);
  // Clear throws away the whole drawing, so it asks first.
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [panelStart, setPanelStart] = useState<string | null>(null);
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
  const [sizeOpen, setSizeOpen] = useState(false);
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
  // Set when a drawing kept across sign-in has just been put back.
  const [restored, setRestored] = useState(false);
  const canvasRef = useRef<DrawingCanvasHandle>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (ops.length === 0) {
      setLocalError("Draw something first.");
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

  /** A swatch or a recent colour: used straight away, and settled. */
  function chooseColor(next: string) {
    previewColor(next);
    addRecent(next);
    setPanelOpen(false);
  }

  function openPanel() {
    setPanelStart(color);
    setPanelOpen(true);
  }

  /** Closing the panel settles whatever it was left on into Recent. */
  function closePanel() {
    if (panelOpen && color !== panelStart) addRecent(color);
    setPanelOpen(false);
  }

  function addOp(op: DrawOp) {
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
      setLocalError("Draw something first.");
      return;
    }
    setLocalError(null);
    setSizeOpen(false);
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
          onDraw={addOp}
        />

        {step === "drawing" ? (
          <>
            {/* Every tool in one grid of big targets: what you draw with,
              then what else a finger can do, then how big. */}
            <fieldset className="grid grid-cols-4 gap-2" disabled={pending}>
              <legend className="sr-only">Tool</legend>
              {BRUSHES.map((option) => {
                const BrushIcon = BRUSH_ICONS[option.value];
                return (
                  <ToolButton
                    key={option.value}
                    icon={<BrushIcon />}
                    label={option.name}
                    pressed={tool === option.value}
                    onClick={() =>
                      switchTool(() => {
                        setBrush(option.value);
                        setMode(null);
                        remember(BRUSH_STORAGE_KEY, option.value);
                      })
                    }
                  />
                );
              })}
              {/* Each of these toggles: pressing it again goes back to the
                brush, the way the bucket always has. */}
              <ToolButton
                icon={<PaintBucketIcon />}
                label="Fill"
                pressed={tool === "fill"}
                onClick={() =>
                  switchTool(() =>
                    setMode((current) => (current === "fill" ? null : "fill")),
                  )
                }
              />
              <ToolButton
                icon={<ShapesIcon />}
                label="Shapes"
                pressed={isShapeTool(tool)}
                onClick={() =>
                  switchTool(() =>
                    setMode((current) =>
                      current !== null && isShapeTool(current)
                        ? null
                        : lastShape,
                    ),
                  )
                }
              />
              <ToolButton
                icon={<LassoIcon />}
                label="Lasso"
                pressed={tool === "lasso"}
                title="Circle part of your drawing to move or resize it"
                onClick={() =>
                  switchTool(() =>
                    setMode((current) =>
                      current === "lasso" ? null : "lasso",
                    ),
                  )
                }
              />
              {/* A dot of the current brush: pressing it opens the slider, so
                the size only takes room when it's being changed. */}
              <ToolButton
                icon={<SizeDot size={size} color={isErasing ? null : color} />}
                label="Size"
                ariaLabel={`Brush size, ${size}`}
                expanded={sizeOpen}
                onClick={() => setSizeOpen((open) => !open)}
              />
            </fieldset>

            {sizeOpen && (
              <div className="motion-safe:animate-fade-up flex items-center gap-3">
                <Label
                  htmlFor="brush-size"
                  className="text-muted-foreground text-sm"
                >
                  {isErasing ? "Eraser" : "Size"}
                </Label>
                <input
                  id="brush-size"
                  type="range"
                  min={MIN_SIZE}
                  max={MAX_SIZE}
                  value={size}
                  disabled={pending}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    previewSize();
                    if (isErasing) {
                      setEraserSize(next);
                      remember(ERASER_SIZE_STORAGE_KEY, String(next));
                    } else {
                      setSize(next);
                      remember(SIZE_STORAGE_KEY, String(next));
                    }
                  }}
                  className="accent-primary h-11 flex-1"
                  autoFocus
                />
                {tool === "pen" && (
                  // With the pen's size, since it's how the pen's width behaves.
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-pressed={pressure}
                    disabled={pending}
                    title="Let the pen's width follow how hard you press, or how fast you draw"
                    className={PRESSED}
                    onClick={() => {
                      const next = !pressure;
                      setPressure(next);
                      remember(PRESSURE_STORAGE_KEY, String(next));
                    }}
                  >
                    Pressure
                  </Button>
                )}
              </div>
            )}

            {tool === "lasso" && (
              <p className="text-muted-foreground motion-safe:animate-fade-up text-sm">
                Draw a loop round part of your drawing, then drag it or its
                corners.
              </p>
            )}

            {isShapeTool(tool) && (
              <fieldset
                className="motion-safe:animate-fade-up flex flex-wrap items-center gap-2"
                disabled={pending}
              >
                <legend className="sr-only">Shape</legend>
                {SHAPES.map((option) => {
                  const ShapeIcon = SHAPE_ICONS[option.value];
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-pressed={tool === option.value}
                      className={PRESSED}
                      onClick={() => {
                        setMode(option.value);
                        setLastShape(option.value);
                      }}
                    >
                      <ShapeIcon />
                      {option.name}
                    </Button>
                  );
                })}
                <span className="text-muted-foreground text-sm">
                  Drag to draw it
                </span>
              </fieldset>
            )}

            {/* Seven columns: the six colours and the wheel fill a 375px phone
              at 44px each, and grow on anything wider. */}
            <fieldset className="grid grid-cols-7 gap-1.5" disabled={pending}>
              <legend className="sr-only">Colour</legend>
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

              {/* Drawn as a wheel so it reads as "any colour"; it opens the
                colour panel below. */}
              <button
                type="button"
                aria-label="Colour wheel"
                aria-expanded={panelOpen}
                onClick={() => (panelOpen ? closePanel() : openPanel())}
                className={`${SWATCH} aria-expanded:ring-primary aria-expanded:ring-2 aria-expanded:ring-offset-2`}
                style={{
                  background:
                    "conic-gradient(#ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)",
                }}
              />
            </fieldset>

            {panelOpen && (
              <div className="motion-safe:animate-fade-up">
                <ColorPanel color={color} onChange={previewColor} />
              </div>
            )}

            {recents.length > 0 && (
              <fieldset disabled={pending}>
                <legend className="text-muted-foreground mb-1.5 text-sm">
                  Recent
                </legend>
                <div className="grid grid-cols-7 gap-1.5">
                  {recents.map((recent) => (
                    <button
                      key={recent}
                      type="button"
                      aria-label={`Recent ${recent}`}
                      aria-pressed={color === recent}
                      onClick={() => chooseColor(recent)}
                      className={SWATCH}
                      style={{ backgroundColor: recent }}
                    />
                  ))}
                </div>
              </fieldset>
            )}

            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-pressed={showGrid}
                  disabled={pending}
                  className={PRESSED}
                  onClick={() => {
                    const next = !showGrid;
                    setShowGrid(next);
                    remember(GRID_STORAGE_KEY, String(next));
                  }}
                >
                  <GridFourIcon />
                  Grid
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-pressed={assist}
                  disabled={pending}
                  title="Hold still at the end of a line or shape to snap it perfect"
                  className={PRESSED}
                  onClick={() => {
                    const next = !assist;
                    setAssist(next);
                    remember(ASSIST_STORAGE_KEY, String(next));
                  }}
                >
                  <MagnetIcon />
                  Snap
                </Button>
              </div>
              <div className="flex gap-0.5">
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={pending || ops.length === 0}
                  aria-label="Clear"
                  title="Clear the whole drawing"
                  aria-expanded={confirmingClear}
                  onClick={() => setConfirmingClear((open) => !open)}
                >
                  <TrashIcon />
                </Button>
              </div>
            </div>

            {confirmingClear && ops.length > 0 && (
              <div
                role="alertdialog"
                aria-label="Clear the drawing"
                className="motion-safe:animate-fade-up flex items-center justify-between gap-2 rounded-2xl border px-4 py-2"
              >
                <span className="text-sm font-medium">
                  Clear your whole drawing?
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmingClear(false)}
                  >
                    Keep it
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      canvasRef.current?.cancelSelection();
                      setOps([]);
                      setUndone([]);
                      setConfirmingClear(false);
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
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
                    setLocalError("Draw something first.");
                    return false;
                  }
                  setLocalError(null);
                  // A selection still being moved goes down where it is, so it's
                  // part of what's kept.
                  canvasRef.current?.commitSelection();
                  return true;
                }}
                onSignIn={() => saveDraft(slug, ops)}
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
