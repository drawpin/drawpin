"use client";

import { XIcon } from "@phosphor-icons/react";
import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { type PinColor, pinStyle } from "@/components/pin";
import { describeTile, TileCaption } from "./tile-caption";
import type { Tile } from "./tiles";

/** Opening eases out like a spring; closing is quicker, since attention has moved on. */
const OPEN = { duration: 460, easing: "cubic-bezier(0.32, 0.72, 0, 1)" };
const CLOSE = { duration: 280, easing: "cubic-bezier(0.32, 0.72, 0, 1)" };

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The transform that puts `frame` (laid out at its full size) exactly over
 * `source` on the board, tilted as the drawing was: the FLIP "first" state.
 */
function flipFrom(source: HTMLElement, frame: HTMLElement, lean: number) {
  const from = source.getBoundingClientRect();
  const to = frame.getBoundingClientRect();
  const scale = from.width / to.width;
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  return `translate(${dx}px, ${dy}px) scale(${scale}) rotate(${lean}deg)`;
}

/**
 * A drawing taken down off the board to look at up close (UI pass,
 * 2026-10-01). It grows out of the spot it was pinned in and shrinks back
 * into it on close (FLIP), so it reads as the same piece of paper; the
 * caller hides the board's copy until `onClosed`.
 *
 * A native modal `<dialog>`: it traps focus, Escape closes it, and focus goes
 * back to the drawing that opened it. Reduced motion gets a plain fade.
 */
export function DrawingCloseUp({
  tile,
  source,
  lean,
  pinColor,
  onClosed,
}: {
  tile: Tile;
  /** The drawing's paper on the board, which this grows from and back into. */
  source: HTMLElement;
  /** The paper's tilt on the board, in degrees. */
  lean: number;
  pinColor: PinColor;
  /** Called once the closing animation has finished. */
  onClosed: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const closing = useRef(false);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const frame = frameRef.current;
    if (!dialog || !frame) return;
    if (!dialog.open) dialog.showModal();
    // Strict Mode runs this twice: measure the frame where it really is.
    frame.getAnimations().forEach((running) => running.cancel());
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    if (reducedMotion()) {
      frame.animate({ opacity: [0, 1] }, { duration: 150, easing: "ease-out" });
    } else {
      frame.animate(
        { transform: [flipFrom(source, frame, lean), "none"] },
        { ...OPEN, fill: "backwards" },
      );
    }
    return () => {
      root.style.overflow = overflow;
    };
  }, [source, lean]);

  const close = useCallback(() => {
    const dialog = dialogRef.current;
    const frame = frameRef.current;
    if (!dialog || !frame || closing.current) return;
    closing.current = true;
    dialog.dataset.closing = "";
    // Closed mid-opening: measure from where the drawing really is.
    frame.getAnimations().forEach((running) => running.cancel());
    const animation = reducedMotion()
      ? frame.animate({ opacity: [1, 0] }, { duration: 120, fill: "forwards" })
      : frame.animate(
          { transform: ["none", flipFrom(source, frame, lean)] },
          { ...CLOSE, fill: "forwards" },
        );
    animation.onfinish = () => {
      dialog.close();
      onClosed();
    };
  }, [source, lean, onClosed]);

  // Escape runs the closing animation instead of the dialog's instant close.
  useEffect(() => {
    const dialog = dialogRef.current;
    const onCancel = (event: Event) => {
      event.preventDefault();
      close();
    };
    dialog?.addEventListener("cancel", onCancel);
    return () => dialog?.removeEventListener("cancel", onCancel);
  }, [close]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={describeTile(tile)}
      className="close-up m-0 h-dvh max-h-none w-dvw max-w-none bg-transparent p-0"
      // A tap anywhere but the drawing closes it.
      onClick={(event) => {
        if (!frameRef.current?.contains(event.target as Node)) close();
      }}
    >
      <div className="flex h-full flex-col items-center justify-center gap-5 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div
          ref={frameRef}
          style={pinStyle(pinColor)}
          className="pinned pinned-lg relative flex w-full max-w-[min(30rem,56dvh)] flex-col gap-3 bg-white p-2.5 pb-3 shadow-[0_8px_16px_rgb(15_27_45/0.25),0_30px_60px_rgb(15_27_45/0.35)]"
        >
          <Image
            src={tile.imageUrl}
            alt={describeTile(tile)}
            width={512}
            height={512}
            // Tiles are already small WebP files served from the storage CDN.
            unoptimized
            className="aspect-square w-full object-cover"
          />
          <span className="px-1">
            <TileCaption tile={tile} large />
          </span>
        </div>
        <div className="close-up-controls flex w-full max-w-[min(30rem,56dvh)] justify-end">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            autoFocus
            className="focus-visible:ring-highlight grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/35 transition-colors duration-150 ease-out outline-none hover:bg-white/25 focus-visible:ring-3"
          >
            <XIcon weight="bold" className="size-5" />
          </button>
        </div>
      </div>
    </dialog>
  );
}
