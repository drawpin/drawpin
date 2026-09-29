"use client";

import { Popover } from "@base-ui/react/popover";

/**
 * The brush size, as the last button in the tool rail: a dot at the current
 * size, which opens an upright slider beside it (chosen from prototypes on
 * 2026-09-28). Size is changed now and then rather than every stroke, so it
 * only takes room while it's being changed; the popover closes as soon as
 * someone draws, like a tool's tips.
 *
 * The slider is a native range stood on its end, so it keeps the keyboard,
 * screen-reader and touch behaviour of a real slider. Browsers without
 * upright form controls (older iOS) show it level, which still works.
 */
export function SizePopout({
  size,
  min,
  max,
  color,
  label,
  disabled,
  onChange,
}: {
  size: number;
  min: number;
  max: number;
  /** The brush's colour for the dot, or `null` for the eraser's outline. */
  color: string | null;
  /** "Brush size" or "Eraser size": each keeps its own. */
  label: string;
  disabled?: boolean;
  onChange: (next: number) => void;
}) {
  const diameter = Math.min(Math.max(size / 2.5, 4), 22);

  return (
    <Popover.Root>
      <Popover.Trigger
        disabled={disabled}
        aria-label={`${label}, ${size}`}
        title={label}
        className="focus-visible:ring-highlight hover:bg-accent data-popup-open:border-primary data-popup-open:bg-secondary grid size-11 cursor-pointer place-items-center rounded-[14px] border border-transparent outline-none focus-visible:ring-3 disabled:cursor-default disabled:opacity-50 data-popup-open:shadow-[inset_0_0_0_1px_var(--primary)]"
      >
        <span
          aria-hidden
          className="border-foreground/40 rounded-full border"
          style={{
            width: diameter,
            height: diameter,
            backgroundColor: color ?? "transparent",
          }}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="right" align="end" sideOffset={10}>
          <Popover.Popup className="bg-background shadow-lift flex w-16 origin-(--transform-origin) flex-col items-center gap-1.5 rounded-2xl border py-3 transition-[transform,opacity] duration-150 ease-out outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-100 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
            <Popover.Title className="sr-only">{label}</Popover.Title>
            <input
              type="range"
              min={min}
              max={max}
              value={size}
              aria-label={label}
              aria-orientation="vertical"
              onChange={(event) => onChange(Number(event.target.value))}
              className="accent-primary h-40 w-11 cursor-pointer [direction:rtl] [writing-mode:vertical-lr]"
            />
            <span className="text-muted-foreground text-xs font-semibold tabular-nums">
              {size}
            </span>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
