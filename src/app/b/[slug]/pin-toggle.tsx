"use client";

import { useState, useTransition } from "react";
import { Toast } from "@base-ui/react/toast";
import { PushPinIcon } from "@phosphor-icons/react";
import {
  pinBoardAction,
  type SidebarActionResult,
  unpinBoardAction,
} from "@/components/app-shell/actions";
import { useShell } from "@/components/app-shell/shell-frame";
import { HEADER_BUTTON } from "./board-look";

const TRY_AGAIN = "That didn't work. Try again.";

/**
 * Pins or unpins the board from its own header (docs/design/profiles.md,
 * Row menu): "Pin" / "Pinned", icon-only on a phone. Only for a signed-in
 * account; a device's list can't be pinned, so the page leaves it out
 * signed out.
 *
 * It reads the pin from the shell's shared list once the sidebar has one
 * with this board in it, so a pin made from the sidebar's row menu shows
 * here too, and its own changes land in the sidebar. Until then it goes by
 * what the page knew when it rendered.
 *
 * @param venueId - The board.
 * @param pinned - Whether it was pinned when the page rendered.
 */
export function PinToggle({
  venueId,
  pinned: initiallyPinned,
}: {
  venueId: string;
  pinned: boolean;
}) {
  const { boards, setBoards } = useShell();
  const toasts = Toast.useToastManager();
  const [pending, startTransition] = useTransition();
  // Before the shared list has this board, and while a change is on its way.
  const [own, setOwn] = useState(initiallyPinned);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  const listed = boards?.find((board) => board.venueId === venueId);
  const pinned = optimistic ?? (listed ? listed.pinnedAt !== null : own);

  function toggle() {
    if (pending) return;
    const next = !pinned;
    setOptimistic(next);
    startTransition(async () => {
      let result: SidebarActionResult;
      try {
        result = await (next ? pinBoardAction : unpinBoardAction)({ venueId });
      } catch (error) {
        console.error(error);
        result = { ok: false, message: TRY_AGAIN };
      }
      if (result.ok) {
        setBoards(result.boards);
        setOwn(next);
      } else {
        toasts.add({ title: result.message });
      }
      setOptimistic(null);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      // Not `disabled`: that would drop focus from the button mid-tap.
      aria-disabled={pending}
      aria-pressed={pinned}
      aria-label={pinned ? "Unpin this board" : "Pin this board"}
      className={`${HEADER_BUTTON} aria-pressed:text-primary h-11 shrink-0 cursor-pointer px-3 aria-pressed:bg-white aria-pressed:hover:bg-white/90`}
    >
      <PushPinIcon weight={pinned ? "fill" : "bold"} className="size-5" />
      <span aria-hidden className="hidden sm:inline">
        {pinned ? "Pinned" : "Pin"}
      </span>
    </button>
  );
}
