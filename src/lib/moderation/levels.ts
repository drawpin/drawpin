/**
 * The board moderation levels as people see them (ADR-012): their names, and
 * what the owner is told when picking one. What each level actually blocks is
 * in policy.ts. Kept free of server-only code, so the setup and admin forms
 * can import it.
 */
import type { ModerationLevel } from "./policy";

/** Every level, in the order the owner is offered them. */
export const MODERATION_LEVELS = [
  "all_ages",
  "standard",
  "late_night",
] as const satisfies readonly ModerationLevel[];

/** The level a new board starts on, and the one an unknown value reads as. */
export const DEFAULT_MODERATION_LEVEL: ModerationLevel = "all_ages";

/** A level's name and what the owner is told it does when picking it. */
export const MODERATION_LEVEL_INFO: Record<
  ModerationLevel,
  { name: string; forOwner: string }
> = {
  all_ages: {
    name: "All Ages",
    forOwner:
      "Best for family spots and businesses. Full moderation blocking anything suggestive, crude or violent.",
  },
  standard: {
    name: "Standard",
    forOwner: "Allows swearing, violence and gore.",
  },
  late_night: {
    name: "Late Night",
    forOwner:
      "No moderation, except the very specific cases the law requires (sexual content involving minors is always blocked).",
  },
};

/**
 * Reads a stored `venues.moderation_level`. Anything that isn't a known level
 * reads as All Ages, so a bad value moderates more, never less.
 */
export function toModerationLevel(value: unknown): ModerationLevel {
  return (
    MODERATION_LEVELS.find((level) => level === value) ??
    DEFAULT_MODERATION_LEVEL
  );
}
