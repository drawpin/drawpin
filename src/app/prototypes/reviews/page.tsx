import type { Metadata } from "next";
import { Harness } from "./harness";

export const metadata: Metadata = {
  title: "Review prototypes · DrawPin",
  robots: { index: false, follow: false },
};

/**
 * Ways to show what people say about DrawPin, behind a picker (UI pass,
 * 2026-10-05). A design exploration only: deleted once one is picked.
 */
export default async function ReviewPrototypes({
  searchParams,
}: PageProps<"/prototypes/reviews">) {
  return <Harness initial={Number((await searchParams).v) - 1} />;
}
