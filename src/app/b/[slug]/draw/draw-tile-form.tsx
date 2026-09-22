"use client";

import {
  startTransition,
  useActionState,
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
import { BASE_COLORS, parseRecents, shadesOf, withRecent } from "./palette";
import type { Brush } from "./render";
import type { PostTileState } from "./schema";

/** Brush sizes in tile units, so they mean the same on any screen. */
const MIN_SIZE = 4;
const MAX_SIZE = 64;
const DEFAULT_SIZE = 18;

/** Pen first: it's what most people reach for, and what they already know. */
const BRUSHES: { value: Brush; name: string }[] = [
  { value: "pen", name: "Pen" },
  { value: "marker", name: "Marker" },
  { value: "spray", name: "Spray" },
  { value: "eraser", name: "Eraser" },
];

const BRUSH_STORAGE_KEY = "drawpin:brush";
const SIZE_STORAGE_KEY = "drawpin:brush-size";
const ERASER_SIZE_STORAGE_KEY = "drawpin:eraser-size";
/** Erasing is usually coarser work than drawing, so it starts bigger. */
const DEFAULT_ERASER_SIZE = 36;

/** How long a press has to last before it counts as asking for shades. */
const HOLD_MS = 350;
const COLOR_STORAGE_KEY = "drawpin:brush-color";
const RECENTS_STORAGE_KEY = "drawpin:recent-colors";
const GRID_STORAGE_KEY = "drawpin:show-grid";

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
  const [filling, setFilling] = useState(false);
  // What they used last time, read the same way the hydration flag is: the
  // server has no storage, so its snapshot is null and the first client
  // render matches the HTML it's hydrating.
  const storedBrush = useStored(BRUSH_STORAGE_KEY);
  const storedColor = useStored(COLOR_STORAGE_KEY);
  const storedRecents = useStored(RECENTS_STORAGE_KEY);
  const storedSize = Number(useStored(SIZE_STORAGE_KEY));
  const storedEraserSize = Number(useStored(ERASER_SIZE_STORAGE_KEY));
  const storedGrid = useStored(GRID_STORAGE_KEY);

  const [pickedBrush, setBrush] = useState<Brush | null>(null);
  const [pickedColor, setColor] = useState<string | null>(null);
  const [pickedRecents, setRecents] = useState<string[] | null>(null);
  // Which base colour is showing its shades, if any.
  const [openShades, setOpenShades] = useState<string | null>(null);
  const [pickedSize, setSize] = useState<number | null>(null);
  const [pickedEraserSize, setEraserSize] = useState<number | null>(null);
  const [pickedGrid, setShowGrid] = useState<boolean | null>(null);

  const brush =
    pickedBrush ??
    (BRUSHES.some((option) => option.value === storedBrush)
      ? (storedBrush as Brush)
      : "pen");
  const color = pickedColor ?? storedColor ?? BASE_COLORS[0].value;
  const recents = pickedRecents ?? parseRecents(storedRecents);
  const isErasing = brush === "eraser";

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
  // Things undone but not yet replaced, newest last.
  const [undone, setUndone] = useState<DrawOp[]>([]);
  // Drawing comes first and alone; who you are and what to call it are asked
  // once there's something to post.
  const [step, setStep] = useState<"drawing" | "details">("drawing");
  const [sizeOpen, setSizeOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const holdTimer = useRef<number | null>(null);
  // A press that lasted long enough is followed by a click; without this the
  // click would close the shades the press just opened.
  const holdFired = useRef(false);

  function cancelHold() {
    if (holdTimer.current !== null) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

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

  function chooseColor(next: string) {
    setColor(next);
    remember(COLOR_STORAGE_KEY, next);

    const updated = withRecent(recents, next);
    setRecents(updated);
    remember(RECENTS_STORAGE_KEY, JSON.stringify(updated));
  }

  function addOp(op: DrawOp) {
    setOps((current) => [...current, op]);
    // Doing something new is a new branch: what was undone can't come back.
    setUndone([]);
  }

  function undo() {
    setOps((current) => {
      const last = current.at(-1);
      if (last) setUndone((redoable) => [...redoable, last]);
      return current.slice(0, -1);
    });
  }

  function redo() {
    setUndone((current) => {
      const last = current.at(-1);
      if (last) setOps((drawn) => [...drawn, last]);
      return current.slice(0, -1);
    });
  }

  function goToDetails() {
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
        brush={brush}
        filling={filling}
        showGrid={showGrid}
        disabled={pending}
        onDraw={addOp}
      />

      {step === "drawing" ? (
        <>
          <fieldset className="flex gap-2" disabled={pending}>
            <legend className="sr-only">Brush</legend>
            {BRUSHES.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={
                  !filling && brush === option.value ? "default" : "outline"
                }
                size="sm"
                aria-pressed={!filling && brush === option.value}
                onClick={() => {
                  setBrush(option.value);
                  setFilling(false);
                  remember(BRUSH_STORAGE_KEY, option.value);
                }}
              >
                {option.name}
              </Button>
            ))}
            <Button
              type="button"
              variant={filling ? "default" : "outline"}
              size="sm"
              aria-pressed={filling}
              onClick={() => setFilling((current) => !current)}
            >
              Fill
            </Button>
          </fieldset>

          <fieldset className="flex flex-wrap gap-2" disabled={pending}>
            <legend className="sr-only">Colour</legend>
            {BASE_COLORS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-label={`${option.name}, hold for shades`}
                aria-pressed={color === option.value}
                onClick={() => {
                  if (holdFired.current) {
                    holdFired.current = false;
                    return;
                  }
                  // Tapping the colour you already have opens its shades, so
                  // there's a way in for anyone who never tries holding.
                  if (color === option.value) {
                    setOpenShades((current) =>
                      current === option.value ? null : option.value,
                    );
                    return;
                  }
                  setOpenShades(null);
                  chooseColor(option.value);
                }}
                onPointerDown={() => {
                  holdFired.current = false;
                  holdTimer.current = window.setTimeout(() => {
                    holdFired.current = true;
                    setOpenShades(option.value);
                    chooseColor(option.value);
                  }, HOLD_MS);
                }}
                onPointerUp={cancelHold}
                onPointerLeave={cancelHold}
                onPointerCancel={cancelHold}
                // A long press on a phone would otherwise offer to copy it.
                onContextMenu={(event) => event.preventDefault()}
                className="size-9 rounded-full border-2 aria-pressed:border-black aria-pressed:ring-2 aria-pressed:ring-offset-2"
                style={{ backgroundColor: option.value }}
              />
            ))}

            <label
              className="text-muted-foreground flex size-9 cursor-pointer items-center justify-center rounded-full border-2 border-dashed text-xs"
              aria-label="More colours"
            >
              +
              <input
                type="color"
                value={color}
                onChange={(event) => chooseColor(event.target.value)}
                className="sr-only"
              />
            </label>
          </fieldset>

          {openShades && (
            <fieldset className="flex flex-wrap gap-2" disabled={pending}>
              <legend className="sr-only">Shades</legend>
              {shadesOf(openShades).map((shade) => (
                <button
                  key={shade}
                  type="button"
                  aria-label={`Shade ${shade}`}
                  aria-pressed={color === shade}
                  onClick={() => chooseColor(shade)}
                  className="size-8 rounded-full border-2 aria-pressed:border-black aria-pressed:ring-2 aria-pressed:ring-offset-2"
                  style={{ backgroundColor: shade }}
                />
              ))}
            </fieldset>
          )}

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
              variant="ghost"
              size="sm"
              disabled={pending || ops.length === 0}
              onClick={undo}
            >
              Undo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending || undone.length === 0}
              onClick={redo}
            >
              Redo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending || ops.length === 0}
              onClick={() => {
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
            {pending
              ? "Posting…"
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
