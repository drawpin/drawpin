"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createVenueAction } from "./actions";
import type { SetupState } from "./schema";

const initialState: SetupState = { status: "idle" };

export function SetupForm({ timeZones }: { timeZones: string[] }) {
  const [state, formAction, pending] = useActionState(
    createVenueAction,
    initialState,
  );
  const timeZoneRef = useRef<HTMLSelectElement>(null);

  // The server can't know the owner's time zone, so preselect the browser's
  // after hydration. Written straight to the DOM to keep the select
  // uncontrolled and avoid a hydration mismatch.
  useEffect(() => {
    const select = timeZoneRef.current;
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (select && !select.value && timeZones.includes(detected)) {
      select.value = detected;
    }
  }, [timeZones]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Board name</Label>
        <Input id="name" name="name" maxLength={120} required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="timezone">Time zone</Label>
        <select
          id="timezone"
          name="timezone"
          ref={timeZoneRef}
          required
          defaultValue=""
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-lg border px-2.5 text-base outline-none focus-visible:ring-3 md:text-sm"
        >
          <option value="" disabled>
            Select a time zone
          </option>
          {timeZones.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <p className="text-muted-foreground text-xs">
          Your board&apos;s day resets at 4:00 AM in this time zone.
        </p>
      </div>

      {state.status === "error" && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Creating…" : "Create my board"}
      </Button>
    </form>
  );
}
