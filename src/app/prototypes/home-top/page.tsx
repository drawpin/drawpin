import type { Metadata } from "next";
import { Harness } from "./harness";

export const metadata: Metadata = {
  title: "Home top prototypes · DrawPin",
  robots: { index: false, follow: false },
};

/**
 * Directions for the top of the home page, behind a picker (UI pass,
 * 2026-10-05). A design exploration only: nothing outside this folder
 * imports from it, and the folder is deleted once a direction is picked.
 */
export default async function HomeTopPrototypes({
  searchParams,
}: PageProps<"/prototypes/home-top">) {
  // `?v=2` is the second direction; the harness checks it's in range.
  return <Harness initial={Number((await searchParams).v) - 1} />;
}
