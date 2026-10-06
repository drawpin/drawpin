"use client";

import { Popover } from "@base-ui/react/popover";
import { SlidersHorizontalIcon } from "@phosphor-icons/react";

export type DrawSetting = {
  id: string;
  label: string;
  /** One line on what it does. */
  hint: string;
  on: boolean;
  onChange: (next: boolean) => void;
};

/**
 * The draw screen's settings in one place: switches that change how drawing
 * behaves (Snap, Pressure, Grid) rather than what's being drawn with, so they
 * stay out of the tool rail (chosen 2026-09-28).
 *
 * Opens from its button beside Undo and Redo, growing from it; instant for
 * anyone who asks for reduced motion.
 */
export function DrawSettings({
  settings,
  disabled,
}: {
  settings: DrawSetting[];
  disabled?: boolean;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        disabled={disabled}
        aria-label="Drawing settings"
        title="Drawing settings"
        className="focus-visible:ring-highlight hover:bg-accent aria-expanded:bg-secondary aria-expanded:text-primary data-popup-open:bg-secondary data-popup-open:text-primary grid size-11 cursor-pointer place-items-center rounded-full outline-none focus-visible:ring-3 disabled:opacity-50 [&_svg]:size-5"
      >
        <SlidersHorizontalIcon />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={6}>
          <Popover.Popup className="bg-background shadow-lift flex w-64 origin-(--transform-origin) flex-col gap-0.5 rounded-2xl border p-2 transition-[transform,opacity] duration-150 ease-out outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-100 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
            <Popover.Title className="sr-only">Drawing settings</Popover.Title>
            {settings.map((setting) => (
              <button
                key={setting.id}
                type="button"
                role="switch"
                aria-checked={setting.on}
                onClick={() => setting.onChange(!setting.on)}
                className="hover:bg-accent focus-visible:ring-highlight group flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-left outline-none focus-visible:ring-3"
              >
                <span className="flex flex-col">
                  <span className="text-sm font-semibold">{setting.label}</span>
                  <span className="text-muted-foreground text-xs leading-snug">
                    {setting.hint}
                  </span>
                </span>
                {/* The switch: blue and slid across when on. */}
                <span
                  aria-hidden
                  className="bg-border group-aria-checked:bg-primary relative h-[22px] w-9 shrink-0 rounded-full transition-colors duration-150 motion-reduce:transition-none"
                >
                  <span className="absolute top-[3px] left-[3px] size-4 rounded-full bg-white shadow-sm transition-transform duration-150 ease-out group-aria-checked:translate-x-3.5 motion-reduce:transition-none" />
                </span>
              </button>
            ))}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
