import type { Metadata } from "next";
import { Harness } from "./harness";

export const metadata: Metadata = {
  title: "Board vibe prototypes · DrawPin",
  robots: { index: false, follow: false },
};

/**
 * Four directions for the board's look, behind a picker (UI pass,
 * 2026-10-01). A design exploration only: nothing outside this folder
 * imports from it, and the folder is deleted once a direction is picked.
 */
export default async function BoardVibePrototypes({
  searchParams,
}: PageProps<"/prototypes/board-vibe">) {
  // `?v=2` is the second direction; the harness checks it's in range.
  return <Harness initial={Number((await searchParams).v) - 1} />;
}
