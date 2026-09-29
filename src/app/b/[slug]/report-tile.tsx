"use client";

import { useActionState, useState } from "react";
import { DotsThreeIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { reportTileAction } from "./report-actions";
import { REPORT_REASONS, type ReportState } from "./report-schema";

const initialState: ReportState = { status: "idle" };

/**
 * Flags one tile for the venue's owner. Signed-in only, so a report has
 * somebody behind it (docs/PLAN.md, Moderation).
 *
 * Closed, it's a small "more" button beside the tile's name. Open, the form
 * takes the whole line under it (`basis-full` in the tile's wrapping row).
 */
export function ReportTile({ tileId }: { tileId: string }) {
  const [state, formAction, pending] = useActionState(
    reportTileAction,
    initialState,
  );
  const [open, setOpen] = useState(false);

  if (state.status === "reported") {
    return (
      <p role="status" className="text-muted-foreground basis-full text-sm">
        Reported. The owner will take a look.
      </p>
    );
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Report this drawing"
        title="Report this drawing"
        onClick={() => setOpen(true)}
        className="text-muted-foreground -mt-2 -mr-2 shrink-0"
      >
        <DotsThreeIcon weight="bold" />
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex basis-full flex-col gap-2">
      <input type="hidden" name="tileId" value={tileId} />
      <label className="sr-only" htmlFor={`reason-${tileId}`}>
        Why are you reporting this drawing?
      </label>
      <select
        id={`reason-${tileId}`}
        name="reason"
        defaultValue={REPORT_REASONS[0].value}
        className="border-border h-11 rounded-xl border bg-white px-3 text-sm"
      >
        {REPORT_REASONS.map((reason) => (
          <option key={reason.value} value={reason.value}>
            {reason.label}
          </option>
        ))}
      </select>
      {state.status === "error" && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Sending…" : "Report"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
