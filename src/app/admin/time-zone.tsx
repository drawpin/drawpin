"use client";

import { useActionState, useState } from "react";
import { CaretDownIcon } from "@phosphor-icons/react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { setTimeZoneAction, type TimeZoneState } from "./actions";
import { INLINE_SAVE_ROOM, InlineSave } from "./inline-save";

const initialState: TimeZoneState = { status: "idle" };

/**
 * The board's time zone, and the way to change it (ADR-008).
 *
 * A change waits for the end of this posting week, so the form says when it
 * takes over rather than implying it's immediate. The times it shows are
 * worked out on the server, in the zone each one falls in.
 *
 * Save shows inside the box, in place of its arrow, once a zone other than
 * the saved one is picked. After a save the page brings the zone that was
 * picked as the saved one, so Save goes away by itself.
 */
export function TimeZone({
  zones,
  timeZone,
  scheduled,
  settlingUntil,
  nextChangeFrom,
}: {
  zones: string[];
  /** The zone in force now. */
  timeZone: string;
  /** A change that hasn't taken over yet, and when it will. */
  scheduled: { timeZone: string; from: string } | null;
  /** While a change's first week runs, when another can be made. */
  settlingUntil: string | null;
  /** When a change made now would take over. */
  nextChangeFrom: string;
}) {
  const [state, formAction, pending] = useActionState(
    setTimeZoneAction,
    initialState,
  );
  const saved = scheduled?.timeZone ?? timeZone;
  const [picked, setPicked] = useState(saved);
  const changed = settlingUntil === null && picked !== saved;

  return (
    <div className="flex flex-col gap-2">
      <form action={formAction} className="flex flex-col gap-2">
        <Label htmlFor="board-timezone" className="sr-only">
          Time zone
        </Label>
        <div className="relative">
          <select
            id="board-timezone"
            name="timezone"
            required
            disabled={settlingUntil !== null}
            value={picked}
            onChange={(event) => setPicked(event.target.value)}
            className={cn(
              "border-foreground focus-visible:ring-highlight h-14 w-full cursor-pointer appearance-none truncate rounded-xl border-2 bg-white pr-11 pl-3.5 text-base outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-60",
              changed && INLINE_SAVE_ROOM,
            )}
          >
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {zone.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          {changed ? (
            <InlineSave label="time zone" pending={pending} />
          ) : (
            <CaretDownIcon
              weight="bold"
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2"
            />
          )}
        </div>

        {scheduled ? (
          <p className="text-muted-foreground text-sm">
            Your board is on {timeZone.replaceAll("_", " ")} time until{" "}
            {scheduled.from}, then changes to{" "}
            {scheduled.timeZone.replaceAll("_", " ")}. To keep{" "}
            {timeZone.replaceAll("_", " ")}, pick it again and save.
          </p>
        ) : settlingUntil ? (
          <p className="text-muted-foreground text-sm">
            Your board has just changed time zone. You can change it again from{" "}
            {settlingUntil}.
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            Your board&apos;s day resets at 4:00 AM in this time zone. A change
            starts when this week&apos;s posting closes, {nextChangeFrom}, so
            the week under way isn&apos;t cut short.
          </p>
        )}

        {state.status === "error" && (
          <p role="alert" className="text-destructive text-sm">
            {state.message}
          </p>
        )}
      </form>
    </div>
  );
}
