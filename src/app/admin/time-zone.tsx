"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { setTimeZoneAction, type TimeZoneState } from "./actions";

const initialState: TimeZoneState = { status: "idle" };

/**
 * The board's time zone, and the way to change it (ADR-008).
 *
 * A change waits for the end of this posting week, so the form says when it
 * takes over rather than implying it's immediate. The times it shows are
 * worked out on the server, in the zone each one falls in.
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

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-black tracking-tight">Time zone</h2>
      <form action={formAction} className="flex flex-col gap-2">
        <Label htmlFor="board-timezone" className="sr-only">
          Time zone
        </Label>
        <select
          id="board-timezone"
          name="timezone"
          required
          // Remounts after a save, so it shows what was saved.
          key={scheduled?.timeZone ?? timeZone}
          disabled={settlingUntil !== null}
          defaultValue={scheduled?.timeZone ?? timeZone}
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-lg border px-2.5 text-base outline-none focus-visible:ring-3 disabled:opacity-60 md:text-sm"
        >
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replaceAll("_", " ")}
            </option>
          ))}
        </select>

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

        {settlingUntil === null && (
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="self-start"
            disabled={pending}
          >
            {pending ? "Saving…" : "Save time zone"}
          </Button>
        )}
      </form>
    </section>
  );
}
