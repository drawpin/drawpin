"use client";

import { Popover } from "@base-ui/react/popover";
import { TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Clear, which asks before throwing the whole drawing away.
 *
 * The question pops out from the bin button over everything else, so the
 * canvas and controls don't shift down to make room for it. It grows from
 * the button and fades a little faster on the way out; instant for anyone
 * who asks for reduced motion.
 */
export function ClearButton({
  disabled,
  onClear,
}: {
  disabled: boolean;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        disabled={disabled}
        aria-label="Clear"
        title="Clear the whole drawing"
        className="focus-visible:ring-highlight hover:bg-accent data-popup-open:bg-secondary data-popup-open:text-primary grid size-11 cursor-pointer place-items-center rounded-full outline-none focus-visible:ring-3 disabled:cursor-default disabled:opacity-50 [&_svg]:size-5"
      >
        <TrashIcon />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={6}>
          <Popover.Popup className="bg-background shadow-lift flex w-64 origin-(--transform-origin) flex-col gap-3 rounded-2xl border p-3 transition-[transform,opacity] duration-150 ease-out outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-100 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
            <Popover.Title className="text-sm font-semibold">
              Clear your whole drawing?
            </Popover.Title>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Keep it
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
              >
                Clear
              </Button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
