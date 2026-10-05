import type { Metadata } from "next";
import { Harness } from "./harness";

export const metadata: Metadata = {
  title: "Home page prototypes · DrawPin",
  robots: { index: false, follow: false },
};

/**
 * Directions for the home page, behind a picker (UI pass, 2026-10-05). A
 * design exploration only: nothing outside this folder imports from it, and
 * the folder is deleted once one is picked.
 */
export default async function HomePrototypes({
  searchParams,
}: PageProps<"/prototypes/home">) {
  // `?v=2` is the second direction; the harness checks it's in range.
  return <Harness initial={Number((await searchParams).v) - 1} />;
}
