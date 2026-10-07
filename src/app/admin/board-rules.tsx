"use client";

import { useActionState } from "react";
import { ModerationLevelPicker } from "@/components/moderation-level-picker";
import { Button } from "@/components/ui/button";
import { MODERATION_LEVEL_INFO } from "@/lib/moderation/levels";
import type { ModerationLevel } from "@/lib/moderation/policy";
import { type BoardRulesState, setModerationLevelAction } from "./actions";

const initialState: BoardRulesState = { status: "idle" };

/**
 * The board's moderation level, and the way to change it (ADR-012). Says up
 * front that a change only reaches new posts, since an owner tightening the
 * rules might expect what's already up to be checked again.
 */
export function BoardRules({ level }: { level: ModerationLevel }) {
  const [state, formAction, pending] = useActionState(
    setModerationLevelAction,
    initialState,
  );

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-black tracking-tight">Board rules</h2>
      <form action={formAction} className="flex flex-col gap-2">
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

        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="self-start"
          disabled={pending}
        >
          {pending ? "Saving…" : "Save rules"}
        </Button>
      </form>
    </section>
  );
}
