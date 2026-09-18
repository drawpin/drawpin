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
  type DrawingCanvasHandle,
  type Stroke,
} from "./drawing-canvas";
import type { PostTileState } from "./schema";

const COLORS = [
  { name: "Black", value: "#111827" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Brown", value: "#92400e" },
];

const SIZES = [
  { name: "Thin", value: 8 },
  { name: "Medium", value: 18 },
  { name: "Thick", value: 36 },
];

const NAME_STORAGE_KEY = "drawpin:display-name";

const initialState: PostTileState = { status: "idle" };

const subscribeToNothing = () => () => {};

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
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [color, setColor] = useState(COLORS[0].value);
  const [size, setSize] = useState(SIZES[1].value);
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

    if (strokes.length === 0) {
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
        strokes={strokes}
        color={color}
        size={size}
        disabled={pending}
        onStrokeEnd={(stroke) => setStrokes((current) => [...current, stroke])}
      />

      <fieldset className="flex flex-wrap gap-2" disabled={pending}>
        <legend className="sr-only">Colour</legend>
        {COLORS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-label={option.name}
            aria-pressed={color === option.value}
            onClick={() => setColor(option.value)}
            className="size-9 rounded-full border-2 aria-pressed:border-black aria-pressed:ring-2 aria-pressed:ring-offset-2"
            style={{ backgroundColor: option.value }}
          />
        ))}
      </fieldset>

      <div className="flex flex-wrap items-center gap-2">
        <fieldset className="flex gap-2" disabled={pending}>
          <legend className="sr-only">Brush size</legend>
          {SIZES.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={size === option.value ? "default" : "outline"}
              size="sm"
              aria-pressed={size === option.value}
              onClick={() => setSize(option.value)}
            >
              {option.name}
            </Button>
          ))}
        </fieldset>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending || strokes.length === 0}
          onClick={() => setStrokes((current) => current.slice(0, -1))}
        >
          Undo
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending || strokes.length === 0}
          onClick={() => setStrokes([])}
        >
          Clear
        </Button>
      </div>

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
    </form>
  );
}
