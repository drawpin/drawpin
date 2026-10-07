/**
 * The board moderation levels as people see them (ADR-012): their names, what
 * the owner is told when picking one, and what visitors are told. What each
 * level actually blocks is in policy.ts; keep the two in step. Kept free of server-only code, so the setup and admin forms
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

type LevelInfo = {
  name: string;
  /** What the owner is told it does, when picking it. */
  forOwner: string;
  /** What visitors are told, on the board's rules page. */
  summary: string;
  /** What gets through on this level, beyond what every level allows. */
  allowed: readonly string[];
  /** What's refused on this level. The legal floor is always last. */
  blocked: readonly string[];
  /** The line on the draw screen, on a level that allows more than All Ages. */
  drawNote: string | null;
};

const LEGAL_FLOOR = "Sexual content involving minors, on every board";

/** Each level's name, and what owners and visitors are told about it. */
export const MODERATION_LEVEL_INFO: Record<ModerationLevel, LevelInfo> = {
  all_ages: {
    name: "All Ages",
    forOwner:
      "Best for family spots and businesses. Full moderation blocking anything suggestive, crude or violent.",
    summary:
      "Every drawing and caption is checked before it goes up, and anything suggestive, crude or violent is blocked.",
    allowed: [],
    blocked: [
      "Swearing",
      "Violence, gore and self-harm",
      "Nudity and sexual content",
      "Slurs, hate symbols and harassment",
      "Links, email addresses and phone numbers",
      LEGAL_FLOOR,
    ],
    drawNote: null,
  },
  standard: {
    name: "Standard",
    forOwner: "Allows swearing, violence and gore.",
    summary:
      "Every drawing and caption is checked before it goes up. Swearing, violence and gore are allowed here.",
    allowed: ["Swearing", "Violence and gore"],
    blocked: [
      "Nudity and sexual content",
      "Slurs, hate symbols and harassment",
      "Links, email addresses and phone numbers",
      LEGAL_FLOOR,
    ],
    drawNote:
      "This board allows swearing, violence and gore. Sexual content, slurs and contact details are still blocked.",
  },
  late_night: {
    name: "Late Night",
    forOwner:
      "No moderation, except the very specific cases the law requires (sexual content involving minors is always blocked).",
    summary:
      "This board isn't moderated. Drawings and captions go up without being checked for anything except what the law requires.",
    allowed: ["Anything the law allows"],
    blocked: [LEGAL_FLOOR],
    drawNote:
      "This board isn't moderated. Only sexual content involving minors is blocked.",
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
