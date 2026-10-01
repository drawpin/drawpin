"use client";

import { XIcon } from "@phosphor-icons/react";
import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { ProtoTile } from "./data";
import { hand } from "./fonts";
import { Pin } from "./pin";

/** Opening is a spring-like ease-out; closing is quicker, since attention has moved on. */
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
 * A drawing taken down off the board to look at up close. It grows out of
 * the spot it was pinned in and shrinks back into it on close (FLIP), so it
 * reads as the same piece of paper. The caller hides the board's copy
 * until `onClosed`.
 *
 * A native modal `<dialog>`: it traps focus, Escape closes it, and focus goes
 * back to the drawing that opened it. Reduced motion gets a plain fade.
 */
export function Lightbox({
  tile,
  source,
  lean,
  tackColor,
  onClosed,
}: {
  tile: ProtoTile;
  /** The drawing's frame on the board, which this grows from and back into. */
  source: HTMLElement;
  /** The frame's tilt on the board, in degrees. */
  lean: number;
  tackColor: string;
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
    // Run twice (Strict Mode): measure the frame where it really is.
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

  // Escape: run the closing animation instead of the dialog's instant close.
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
      aria-label={tile.caption ?? `Drawing by ${tile.author}`}
      className="lightbox m-0 h-dvh max-h-none w-dvw max-w-none bg-transparent p-0"
      // A tap anywhere but the drawing closes it.
      onClick={(event) => {
        if (!frameRef.current?.contains(event.target as Node)) close();
      }}
    >
      <div className="flex h-full flex-col items-center justify-center gap-5 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div
          ref={frameRef}
          className="relative w-full max-w-[min(30rem,62dvh)] bg-white p-2.5 shadow-[0_8px_16px_rgb(15_27_45/0.25),0_30px_60px_rgb(15_27_45/0.35)]"
        >
          <Pin
            color={tackColor}
            size={46}
            className="-top-[47px] left-[calc(50%-16px)]"
          />
          <Image
            src={tile.src}
            alt={tile.caption ?? `Drawing by ${tile.author}`}
            width={1024}
            height={1024}
            unoptimized
            className="aspect-square w-full object-cover"
          />
        </div>
        <div className="lightbox-caption flex w-full max-w-[min(30rem,62dvh)] items-start justify-between gap-3 text-white">
          <div className="min-w-0">
            <p className="truncate font-bold">{tile.author}</p>
            {tile.caption && (
              <p className={`${hand.className} text-xl leading-tight`}>
                &ldquo;{tile.caption}&rdquo;
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            autoFocus
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-white/15 ring-1 ring-white/35 transition-colors duration-150 ease-out outline-none hover:bg-white/25 focus-visible:ring-3 focus-visible:ring-[#6badfa]"
          >
            <XIcon weight="bold" className="size-5" />
          </button>
        </div>
      </div>
    </dialog>
  );
}

/**
 * The dim behind the drawing, and the caption coming in after it. The
 * backdrop fades out with the drawing on close.
 */
export const LIGHTBOX_CSS = `
.lightbox::backdrop {
  background: rgb(15 27 45 / 0.78);
  transition: opacity 280ms cubic-bezier(0.32, 0.72, 0, 1);
}
.lightbox[data-closing]::backdrop { opacity: 0; }
.lightbox[data-closing] .lightbox-caption { opacity: 0; transition: opacity 120ms ease-out; }
@keyframes lightbox-dim { from { opacity: 0; } }
@keyframes lightbox-caption {
  from { opacity: 0; translate: 0 8px; filter: blur(2px); }
}
@media (prefers-reduced-motion: no-preference) {
  .lightbox[open]::backdrop { animation: lightbox-dim 320ms cubic-bezier(0.23, 1, 0.32, 1); }
  .lightbox-caption {
    animation: lightbox-caption 320ms cubic-bezier(0.23, 1, 0.32, 1) 180ms both;
  }
}
`;
