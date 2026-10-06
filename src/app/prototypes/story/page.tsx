import type { Metadata } from "next";
import { Harness } from "./harness";

export const metadata: Metadata = {
  title: "Story prototypes · DrawPin",
  robots: { index: false, follow: false },
};

/**
 * Directions for the home page's "Why I made this", behind a picker (UI
 * pass, 2026-10-05). A design exploration only: nothing outside this folder
 * imports from it, and the folder is deleted once a direction is picked.
 */
export default async function StoryPrototypes({
  searchParams,
}: PageProps<"/prototypes/story">) {
  // `?v=2` is the second direction; the harness checks it's in range.
  return <Harness initial={Number((await searchParams).v) - 1} />;
}
