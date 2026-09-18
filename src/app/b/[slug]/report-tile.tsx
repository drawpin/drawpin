"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { reportTileAction } from "./report-actions";
import { REPORT_REASONS, type ReportState } from "./report-schema";

const initialState: ReportState = { status: "idle" };

/**
 * Flags one tile for the venue's owner. Signed-in only, so a report has
 * somebody behind it (docs/PLAN.md, Moderation).
 */
export function ReportTile({ tileId }: { tileId: string }) {
  const [state, formAction, pending] = useActionState(
    reportTileAction,
    initialState,
  );
  const [open, setOpen] = useState(false);

  if (state.status === "reported") {
    return (
      <p role="status" className="text-muted-foreground text-xs">
        Reported. The owner will take a look.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground self-start text-xs underline underline-offset-4"
      >
        Report
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="tileId" value={tileId} />
      <label className="sr-only" htmlFor={`reason-${tileId}`}>
        Why are you reporting this drawing?
      </label>
      <select
        id={`reason-${tileId}`}
        name="reason"
        defaultValue={REPORT_REASONS[0].value}
        className="rounded border px-2 py-1 text-xs"
      >
        {REPORT_REASONS.map((reason) => (
          <option key={reason.value} value={reason.value}>
            {reason.label}
          </option>
        ))}
      </select>
      {state.status === "error" && (
        <p role="alert" className="text-destructive text-xs">
          {state.message}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Sending…" : "Send report"}
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
