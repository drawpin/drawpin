"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

/** How long "Copied" stays on the button. */
const COPIED_FOR_MS = 2000;

type CopyState = "idle" | "copied" | "selected";

/**
 * A value shown with a Copy button beside it, for the owner to paste the
 * board's link or today's code into a message (issue #172).
 *
 * When the clipboard can't be written (no HTTPS, some in-app browsers, a
 * refused permission), the value is selected instead and a line says to copy
 * it from the browser's menu.
 *
 * @param value - Shown as is, and copied exactly.
 * @param name - What the value is, finishing the button's accessible name
 *   ("Copy board link").
 * @param className - Styles for the box the value is shown in.
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
      <div className="flex flex-wrap items-stretch gap-2">
        <p ref={shown} className={cn("min-w-0 flex-1 basis-56", className)}>
          {value}
        </p>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="self-center"
          onClick={copy}
        >
          {state === "copied" ? (
            <>
              <CheckIcon weight="bold" aria-hidden />
              Copied
            </>
          ) : (
            <>
              <CopyIcon weight="bold" aria-hidden />
              Copy<span className="sr-only"> {name}</span>
            </>
          )}
        </Button>
      </div>
      {/* Always in the page, so screen readers hear what changes in it. The
          "copied" line is for them; the button already says it on screen. */}
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
