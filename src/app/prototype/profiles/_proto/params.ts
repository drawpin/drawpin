/**
 * PROTOTYPE ONLY (profiles design step, 2026-11-02): reads the screen's
 * state from the query string, so every variant has its own URL for the
 * screenshots: `v` (a | b | c), `who` (out | in | runner), `open=1` (the
 * phone drawer open), `menu=<slug>` (a board row's menu open), `empty=1`.
 */
import { BOARDS, DEVICE_BOARDS, MEMBER_BOARDS } from "./data";
import type { SidebarProps, Variant, Who } from "./shell";

type Query = Record<string, string | string[] | undefined>;

export function shellProps(query: Query): SidebarProps & {
  variant: Variant;
  defaultOpen: boolean;
} {
  const one = (key: string) => {
    const value = query[key];
    return typeof value === "string" ? value : undefined;
  };
  const v = one("v");
  const variant: Variant = v === "b" || v === "c" ? v : "a";
  const w = one("who");
  const who: Who = w === "out" || w === "in" ? w : "runner";
  const boards =
    one("empty") === "1"
      ? []
      : who === "out"
        ? DEVICE_BOARDS
        : who === "in"
          ? MEMBER_BOARDS
          : BOARDS;
  return {
    variant,
    who,
    boards,
    runs: who === "runner" ? BOARDS.filter((board) => board.owned) : [],
    menuFor: one("menu") ?? null,
    defaultOpen: one("open") === "1",
  };
}
