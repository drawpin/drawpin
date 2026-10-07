import {
  MODERATION_LEVEL_INFO,
  MODERATION_LEVELS,
} from "@/lib/moderation/levels";
import type { ModerationLevel } from "@/lib/moderation/policy";

/**
 * The three board moderation levels as radio cards (ADR-012), each with what
 * it allows. Used at setup and in the owner admin's Board rules card. Posts
 * as `moderationLevel`. Uncontrolled: give it a `key` to show a new value.
 */
export function ModerationLevelPicker({
  defaultLevel,
  legend,
  hideLegend = false,
}: {
  defaultLevel: ModerationLevel;
  legend: string;
  /** For a card whose own heading already says what this is. */
  hideLegend?: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend
        className={
          hideLegend ? "sr-only" : "mb-2 text-sm leading-none font-medium"
        }
      >
        {legend}
      </legend>
      {MODERATION_LEVELS.map((level) => {
        const { name, forOwner } = MODERATION_LEVEL_INFO[level];
        return (
          <label
            key={level}
            className="border-foreground has-[:checked]:bg-secondary has-[:focus-visible]:ring-highlight flex cursor-pointer items-start gap-3 rounded-xl border-2 bg-white p-3 has-[:focus-visible]:ring-3"
          >
            <input
              type="radio"
              name="moderationLevel"
              value={level}
              defaultChecked={level === defaultLevel}
              required
              className="accent-primary mt-1 size-4 shrink-0"
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-bold">{name}</span>
              <span className="text-muted-foreground text-sm">{forOwner}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
