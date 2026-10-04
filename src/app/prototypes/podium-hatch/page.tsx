import type { Metadata } from "next";
import { Harness } from "./harness";

export const metadata: Metadata = {
  title: "Podium hatching prototypes · DrawPin",
  robots: { index: false, follow: false },
};

/**
 * Versions of the vote page podium's pen hatching, behind a picker (UI pass,
 * 2026-10-03). A design exploration only: nothing outside this folder
 * imports from it, and the folder is deleted once one is picked.
 */
export default async function PodiumHatchPrototypes({
  searchParams,
}: PageProps<"/prototypes/podium-hatch">) {
  // `?v=2` is the second version; the harness checks it's in range.
  return <Harness initial={Number((await searchParams).v) - 1} />;
}
