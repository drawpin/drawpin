"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

/** How long "Copied" stays up. */
const COPIED_FOR_MS = 2000;

type CopyState = "idle" | "copied" | "selected";

/**
 * A value shown in a box with a Copy button at its right end, for the owner
 * to paste the board's link or its code into a message (issue #172).
 *
 * With a mouse the button shows while the box is hovered or has keyboard
 * focus; on a touch screen, where nothing hovers, it always shows. The box
 * keeps room for it either way, so nothing moves when it appears.
 *
 * When the clipboard can't be written (no HTTPS, some in-app browsers, a
 * refused permission), the value is selected instead and a line says to copy
 * it from the browser's menu.
 *
 * @param value - Shown as is, and copied exactly.
 * @param name - What the value is, finishing the button's accessible name
 *   ("Copy board link").
 * @param className - Styles for the box the value is shown in. Its right
 *   padding and least height are set here, to fit the button.
 */
export function CopyValue({
  value,
  name,
  className,
}: {
  value: string;
  name: string;
  className?: string;
}) {
  const [state, setState] = useState<CopyState>("idle");
  const shown = useRef<HTMLParagraphElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    clearTimeout(timer.current);
    if (await copyText(value)) {
      setState("copied");
      timer.current = setTimeout(() => setState("idle"), COPIED_FOR_MS);
      return;
    }
    const node = shown.current;
    const selection = window.getSelection();
    if (node && selection) {
      const range = document.createRange();
      range.selectNodeContents(node);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    setState("selected");
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "group/copy relative flex min-h-14 items-center",
          className,
          "pr-14",
        )}
      >
        <p ref={shown} className="min-w-0 flex-1">
          {value}
        </p>
        {/* Seen, not heard: the status line below says it to screen readers. */}
        {state === "copied" && (
          <span
            aria-hidden
            className="border-foreground bg-winner text-foreground animate-in fade-in zoom-in-95 slide-in-from-bottom-1 absolute right-0 bottom-full mb-1.5 rounded-md border-2 px-2 py-0.5 font-sans text-xs font-bold tracking-normal duration-150 ease-out motion-reduce:animate-none"
          >
            Copied
          </span>
        )}
        <button
          type="button"
          onClick={copy}
          className={cn(
            "border-foreground text-foreground hover:bg-secondary focus-visible:ring-highlight absolute top-1/2 right-1.5 inline-flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg border-2 bg-white transition-[opacity,scale,background-color] duration-150 ease-out outline-none focus-visible:ring-3 active:scale-[0.97] motion-reduce:transition-none",
            // Hidden only where something can hover, and never while it has
            // something to say.
            state === "idle" &&
              "[@media(hover:hover)]:scale-90 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within/copy:scale-100 [@media(hover:hover)]:group-focus-within/copy:opacity-100 [@media(hover:hover)]:group-hover/copy:scale-100 [@media(hover:hover)]:group-hover/copy:opacity-100",
          )}
        >
          {state === "copied" ? (
            <>
              <CheckIcon weight="bold" aria-hidden className="size-5" />
              <span className="sr-only">Copied</span>
            </>
          ) : (
            <>
              <CopyIcon weight="bold" aria-hidden className="size-5" />
              <span className="sr-only">Copy {name}</span>
            </>
          )}
        </button>
      </div>
      {/* Always in the page, so screen readers hear what changes in it. */}
      <p
        role="status"
        className={
          state === "selected" ? "text-muted-foreground text-sm" : "sr-only"
        }
      >
        {state === "copied" && `Copied the ${name}.`}
        {state === "selected" &&
          `Couldn't copy it for you. The ${name} is selected: copy it from your browser's menu.`}
      </p>
    </div>
  );
}
