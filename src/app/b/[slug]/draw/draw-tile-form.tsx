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
import { BRUSHES, isShapeTool, type Tool } from "./tools";

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

const NAME_STORAGE_KEY = "drawpin:display-name";

const initialState: PostTileState = { status: "idle" };

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
  /** The signed-in customer's name, or `null` when posting as a guest. */
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

  const [pickedBrush, setBrush] = useState<Brush | null>(null);
  const [pickedColor, setColor] = useState<string | null>(null);
  const [pickedRecents, setRecents] = useState<string[] | null>(null);
  // The colour panel, and the colour it opened on — what it's left on is only
  // added to Recent if it differs.
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelStart, setPanelStart] = useState<string | null>(null);
  const [pickedSize, setSize] = useState<number | null>(null);
  const [pickedEraserSize, setEraserSize] = useState<number | null>(null);
  const [pickedGrid, setShowGrid] = useState<boolean | null>(null);
  const [pickedAssist, setAssist] = useState<boolean | null>(null);

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
  // Things undone but not yet replaced, newest last.
  const [undone, setUndone] = useState<DrawOp[]>([]);
  // Drawing comes first and alone; who you are and what to call it are asked
  // once there's something to post.
  const [step, setStep] = useState<"drawing" | "details">("drawing");
  const [sizeOpen, setSizeOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Remember the visitor's name between posts. Read after hydration and
  // written straight to the uncontrolled input to avoid a hydration mismatch.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAME_STORAGE_KEY);
      if (saved && nameRef.current && !nameRef.current.value) {
        nameRef.current.value = saved;
      }
    } catch {
      // Storage can be blocked (private mode); the name just isn't remembered.
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (ops.length === 0) {
      setLocalError("Draw something first.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const displayName = String(formData.get("displayName") ?? "").trim();
    try {
      if (displayName) localStorage.setItem(NAME_STORAGE_KEY, displayName);
      else localStorage.removeItem(NAME_STORAGE_KEY);
    } catch {
      // See above: remembering the name is best-effort.
    }

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
        disabled={pending}
        onDraw={addOp}
      />

      {step === "drawing" ? (
        <>
          {/* Two rows — what you draw with, then what else a finger can do —
              so every tool fits the narrowest phones and there's room for
              the next one. */}
          <fieldset className="flex gap-2" disabled={pending}>
            <legend className="sr-only">Brush</legend>
            {BRUSHES.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={tool === option.value ? "default" : "outline"}
                size="sm"
                aria-pressed={tool === option.value}
                onClick={() =>
                  switchTool(() => {
                    setBrush(option.value);
                    setMode(null);
                    remember(BRUSH_STORAGE_KEY, option.value);
                  })
                }
              >
                {option.name}
              </Button>
            ))}
          </fieldset>

          {/* Each of these toggles: pressing it again goes back to the brush,
              the way the bucket always has. */}
          <fieldset className="flex gap-2" disabled={pending}>
            <legend className="sr-only">Tool</legend>
            <Button
              type="button"
              variant={tool === "fill" ? "default" : "outline"}
              size="sm"
              aria-pressed={tool === "fill"}
              onClick={() =>
                switchTool(() =>
                  setMode((current) => (current === "fill" ? null : "fill")),
                )
              }
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z" />
                <path d="m5 2 5 5" />
                <path d="M2 13h15" />
                <path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z" />
              </svg>
              Fill
            </Button>
            <Button
              type="button"
              variant={isShapeTool(tool) ? "default" : "outline"}
              size="sm"
              aria-pressed={isShapeTool(tool)}
              onClick={() =>
                switchTool(() =>
                  setMode((current) =>
                    current !== null && isShapeTool(current) ? null : lastShape,
                  ),
                )
              }
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <rect x="2" y="8" width="10" height="10" />
                <circle cx="16" cy="9" r="6" />
              </svg>
              Shapes
            </Button>
            <Button
              type="button"
              variant={tool === "lasso" ? "default" : "outline"}
              size="sm"
              aria-pressed={tool === "lasso"}
              title="Circle part of your drawing to move or resize it"
              onClick={() =>
                switchTool(() =>
                  setMode((current) => (current === "lasso" ? null : "lasso")),
                )
              }
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray="3 3"
                aria-hidden
              >
                <ellipse cx="12" cy="10" rx="9" ry="6" />
                <path d="M6 15c-1 2 0 4 2 5" strokeDasharray="none" />
              </svg>
              Lasso
            </Button>
          </fieldset>

          {tool === "lasso" && (
            <p className="text-muted-foreground text-xs">
              Draw a loop round part of your drawing, then drag it or its
              corners.
            </p>
          )}

          {isShapeTool(tool) && (
            <fieldset className="flex items-center gap-2" disabled={pending}>
              <legend className="sr-only">Shape</legend>
              {SHAPES.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={tool === option.value ? "default" : "outline"}
                  size="sm"
                  aria-pressed={tool === option.value}
                  onClick={() => {
                    setMode(option.value);
                    setLastShape(option.value);
                  }}
                >
                  {option.name}
                </Button>
              ))}
              <span className="text-muted-foreground text-xs">
                Drag to draw it
              </span>
            </fieldset>
          )}

          {/* One row rather than a wrap, scrolling on the narrowest phones:
              a lone wheel on its own line looks like a mistake. */}
          <fieldset
            className="flex gap-2 overflow-x-auto pb-1"
            disabled={pending}
          >
            <legend className="sr-only">Colour</legend>
            {BASE_COLORS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-label={option.name}
                aria-pressed={color === option.value}
                onClick={() => chooseColor(option.value)}
                className="size-9 shrink-0 rounded-full border-2 aria-pressed:border-black aria-pressed:ring-2 aria-pressed:ring-offset-2"
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
              className="size-9 shrink-0 rounded-full border-2 aria-expanded:border-black aria-expanded:ring-2 aria-expanded:ring-offset-2"
              style={{
                background:
                  "conic-gradient(#ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)",
              }}
            />
          </fieldset>

          {panelOpen && <ColorPanel color={color} onChange={previewColor} />}

          {recents.length > 0 && (
            <fieldset
              className="flex flex-wrap items-center gap-2"
              disabled={pending}
            >
              <legend className="sr-only">Recent colours</legend>
              <span className="text-muted-foreground text-xs">Recent</span>
              {recents.map((recent) => (
                <button
                  key={recent}
                  type="button"
                  aria-label={`Recent ${recent}`}
                  aria-pressed={color === recent}
                  onClick={() => chooseColor(recent)}
                  className="size-7 rounded-full border-2 aria-pressed:border-black aria-pressed:ring-2 aria-pressed:ring-offset-2"
                  style={{ backgroundColor: recent }}
                />
              ))}
            </fieldset>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {/* The control is a stroke of the current brush: pressing it opens
              the slider, so the size only takes room when it's being changed. */}
            <button
              type="button"
              onClick={() => setSizeOpen((open) => !open)}
              aria-expanded={sizeOpen}
              aria-label={`Brush size, ${size}`}
              disabled={pending}
              className="flex h-9 w-16 items-center justify-center rounded-md border aria-expanded:border-2 aria-expanded:border-black"
            >
              <svg viewBox="0 0 56 24" className="h-6 w-12" aria-hidden>
                <line
                  x1="6"
                  y1="12"
                  x2="50"
                  y2="12"
                  stroke={isErasing ? "#d1d5db" : color}
                  strokeWidth={Math.max(size / 3, 2)}
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <Button
              type="button"
              variant={showGrid ? "default" : "outline"}
              size="sm"
              aria-pressed={showGrid}
              disabled={pending}
              onClick={() => {
                const next = !showGrid;
                setShowGrid(next);
                remember(GRID_STORAGE_KEY, String(next));
              }}
            >
              Grid
            </Button>
            <Button
              type="button"
              variant={assist ? "default" : "outline"}
              size="sm"
              aria-pressed={assist}
              disabled={pending}
              title="Hold still at the end of a line or shape to snap it perfect"
              onClick={() => {
                const next = !assist;
                setAssist(next);
                remember(ASSIST_STORAGE_KEY, String(next));
              }}
            >
              Snap
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending || ops.length === 0}
              onClick={undo}
              title="Undo (Ctrl+Z)"
              aria-keyshortcuts="Control+Z Meta+Z"
              aria-label="Undo"
            >
              {/* Arrows rather than words, so the row still fits a phone
                  with Snap in it: undo and redo are the one pair of icons
                  everyone already reads. */}
              <svg
                viewBox="0 0 24 24"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M9 14 4 9l5-5" />
                <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
              </svg>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending || undone.length === 0}
              onClick={redo}
              title="Redo (Ctrl+Shift+Z)"
              aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
              aria-label="Redo"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m15 14 5-5-5-5" />
                <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
              </svg>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending || ops.length === 0}
              onClick={() => {
                canvasRef.current?.cancelSelection();
                setOps([]);
                setUndone([]);
              }}
            >
              Clear
            </Button>
          </div>

          {sizeOpen && (
            <div className="flex items-center gap-3">
              <Label
                htmlFor="brush-size"
                className="text-muted-foreground text-xs"
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
                  if (isErasing) {
                    setEraserSize(next);
                    remember(ERASER_SIZE_STORAGE_KEY, String(next));
                  } else {
                    setSize(next);
                    remember(SIZE_STORAGE_KEY, String(next));
                  }
                }}
                className="flex-1 accent-black"
                autoFocus
              />
            </div>
          )}

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}

          {/* Nothing is asked about the drawing until there is one. */}
          <Button
            type="button"
            size="lg"
            disabled={!hydrated || pending}
            onClick={goToDetails}
          >
            Post my tile
          </Button>
        </>
      ) : (
        <>
          {username ? (
            // Signed in: the tile goes up under the name on their account, so
            // there's nothing to ask and nothing to type.
            <p className="text-muted-foreground text-sm">
              Posting as <span className="font-medium">{username}</span>
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="displayName">Name (optional)</Label>
              <Input
                ref={nameRef}
                id="displayName"
                name="displayName"
                maxLength={40}
                autoComplete="nickname"
                placeholder="Leave blank to post anonymously"
              />
            </div>
          )}

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
  );
}
