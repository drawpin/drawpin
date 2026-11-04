import type { OwnedBoard } from "@/lib/my-boards";
import { adminPath } from "./board-field";

export type AdminDestination =
  { kind: "redirect"; to: string } | { kind: "list"; boards: OwnedBoard[] };

/**
 * Where `/admin` takes a signed-in account (ADR-016): to set up a board when
 * it has none, straight to the board when it has one, so a one-board owner
 * sees no extra step, and to the list of its boards otherwise.
 */
export function adminDestination(boards: OwnedBoard[]): AdminDestination {
  if (boards.length === 0) return { kind: "redirect", to: "/setup" };
  if (boards.length === 1) {
    return { kind: "redirect", to: adminPath(boards[0].slug) };
  }
  return { kind: "list", boards };
}
