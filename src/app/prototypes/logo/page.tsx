import type { Metadata } from "next";
import { Harness } from "./harness";

export const metadata: Metadata = {
  title: "Logo prototypes · DrawPin",
  robots: { index: false, follow: false },
};

/**
 * The home page's logo, three ways, behind a picker (UI pass, 2026-10-05).
 * A design exploration only: deleted once one is picked.
 */
export default async function LogoPrototypes({
  searchParams,
}: PageProps<"/prototypes/logo">) {
  return <Harness initial={Number((await searchParams).v) - 1} />;
}
