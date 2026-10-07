"use client";

import { useActionState, useState } from "react";
import { ModerationLevelPicker } from "@/components/moderation-level-picker";
import { MODERATION_LEVEL_INFO } from "@/lib/moderation/levels";
import type { ModerationLevel } from "@/lib/moderation/policy";
import { type BoardRulesState, setModerationLevelAction } from "./actions";
import { SAVE_BUTTON } from "./inline-save";

const initialState: BoardRulesState = { status: "idle" };

/**
 * The board's moderation level, and the way to change it (ADR-012). Says up
 * front that a change only reaches new posts, since an owner tightening the
 * rules might expect what's already up to be checked again.
 *
 * Save shows only once a level other than the saved one is picked, like the
 * name and time zone. After a save the page brings the picked level as the
 * saved one, so Save goes away by itself.
 */
export function BoardRules({ level }: { level: ModerationLevel }) {
  const [state, formAction, pending] = useActionState(
    setModerationLevelAction,
    initialState,
  );
  const [picked, setPicked] = useState<string>(level);
  const changed = picked !== level;

  return (
    <div className="flex flex-col gap-2">
      <form
        action={formAction}
        // The picker's radios are uncontrolled; this only follows them.
        onChange={(event) => {
          // A form's change event comes from the field that changed.
          const input: EventTarget = event.target;
          if (
            input instanceof HTMLInputElement &&
            input.name === "moderationLevel"
          ) {
            setPicked(input.value);
          }
        }}
        className="flex flex-col gap-2"
      >
        {/* Remounts after a save, so it shows what was saved. */}
        <ModerationLevelPicker
          key={level}
          defaultLevel={level}
          legend="Board rules"
          hideLegend
        />
        <p className="text-muted-foreground text-sm">
          A change applies to new posts only. Drawings already on your board
          stay, and you can still remove any of them.
        </p>

        {state.status === "error" && (
          <p role="alert" className="text-destructive text-sm">
            {state.message}
          </p>
        )}
        {state.status === "saved" && (
          <p role="status" className="text-muted-foreground text-sm">
            Your board is on {MODERATION_LEVEL_INFO[state.level].name}.
          </p>
        )}

        {changed && (
          <button
            type="submit"
            disabled={pending}
            className={`${SAVE_BUTTON} self-start`}
          >
            {pending ? "Saving…" : "Save rules"}
          </button>
        )}
      </form>
    </div>
  );
}
