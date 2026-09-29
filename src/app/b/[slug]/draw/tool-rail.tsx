"use client";

import { Popover } from "@base-ui/react/popover";
import type { Icon } from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";

export type RailTool = {
  id: string;
  label: string;
  icon: Icon;
  /** A line on how to use it, shown beside it on a second tap. */
  tip: string;
  /**
   * Opens its tips as soon as it's picked, for a tool whose tips hold a
   * choice or a how-to you need before the first stroke (Shapes, Lasso).
   */
  tipsOnPick?: boolean;
};

/**
 * The draw screen's tools as a column beside the canvas (chosen from
 * prototypes on 2026-09-28, GoodNotes-style).
 *
 * The first tap picks a tool. Tapping the tool you're already on opens its
 * tips beside it, level with it and pointing at it; drawing, or tapping
 * anywhere else, closes them. Each button is a 44px target, the icon alone
 * with its name for screen readers and as a tooltip.
 *
 * Picking a tool is instant, since it happens constantly. The tips grow out
 * of their tool and fade out slightly faster than they came in; both are
 * skipped for anyone who asks for reduced motion.
 */
export function ToolRail({
  tools,
  isActive,
  onPick,
  extra,
  footer,
  disabled,
}: {
  tools: RailTool[];
  isActive: (id: string) => boolean;
  onPick: (id: string) => void;
  /** Controls to show in a tool's tips under its text, e.g. which shape. */
  extra?: (id: string) => ReactNode;
  /** Below the tools, after a divider: the size, which applies to all of them. */
  footer?: ReactNode;
  disabled?: boolean;
}) {
  // The tool whose tips are open, and its button, which they point at.
  const [tip, setTip] = useState<{ id: string; anchor: HTMLElement } | null>(
    null,
  );
  const open = tools.find((tool) => tool.id === tip?.id) ?? null;

  return (
    <>
      <fieldset
        disabled={disabled}
        className="flex flex-col items-center gap-1 rounded-[18px] border bg-white p-1"
      >
        <legend className="sr-only">Tool</legend>
        {tools.map((tool) => {
          const ToolIcon = tool.icon;
          const active = isActive(tool.id);
          return (
            <button
              key={tool.id}
              type="button"
              aria-label={tool.label}
              title={tool.label}
              aria-pressed={active}
              onClick={(event) => {
                const anchor = event.currentTarget;
                if (active) {
                  setTip((current) =>
                    current?.id === tool.id ? null : { id: tool.id, anchor },
                  );
                  return;
                }
                onPick(tool.id);
                setTip(tool.tipsOnPick ? { id: tool.id, anchor } : null);
              }}
              className="focus-visible:ring-highlight hover:bg-accent aria-pressed:border-primary aria-pressed:bg-secondary aria-pressed:text-primary grid size-11 cursor-pointer place-items-center rounded-[14px] border border-transparent transition-[background-color,transform] duration-100 ease-out outline-none focus-visible:ring-3 active:scale-[0.94] disabled:cursor-default disabled:opacity-50 aria-pressed:shadow-[inset_0_0_0_1px_var(--primary)] motion-reduce:transition-none motion-reduce:active:scale-100 [&_svg]:size-6"
            >
              <ToolIcon />
            </button>
          );
        })}
        {footer && (
          <>
            <span aria-hidden className="bg-border my-1 h-px w-7" />
            {footer}
          </>
        )}
      </fieldset>

      <Popover.Root
        open={open !== null}
        onOpenChange={(next) => {
          if (!next) setTip(null);
        }}
      >
        <Popover.Portal>
          <Popover.Positioner
            anchor={tip?.anchor}
            side="right"
            align="start"
            sideOffset={10}
            alignOffset={-8}
            collisionPadding={16}
          >
            <Popover.Popup className="bg-background shadow-lift flex w-56 origin-(--transform-origin) flex-col gap-2 rounded-2xl border p-3 transition-[transform,opacity] duration-150 ease-out outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-100 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
              {open && (
                <>
                  <Popover.Title className="text-sm font-bold">
                    {open.label}
                  </Popover.Title>
                  <Popover.Description className="text-muted-foreground text-sm leading-snug">
                    {open.tip}
                  </Popover.Description>
                  {extra?.(open.id)}
                </>
              )}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
}
