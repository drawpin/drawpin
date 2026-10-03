import type { Metadata } from "next";
import { Harness } from "./harness";

export const metadata: Metadata = {
  title: "Blank-tile nudge prototypes · DrawPin",
  robots: { index: false, follow: false },
};

/**
 * Looks for the draw screen's blank-tile nudge, behind a picker (UI pass,
 * 2026-10-02). A design exploration only: nothing outside this folder
 * imports from it, and the folder is deleted once a look is picked.
 */
export default async function BlankNudgePrototypes({
  searchParams,
}: PageProps<"/prototypes/blank-nudge">) {
  // `?v=2` is the second look; the harness checks it's in range.
  return <Harness initial={Number((await searchParams).v) - 1} />;
}
