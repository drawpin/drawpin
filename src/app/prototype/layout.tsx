import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Prototype · DrawPin",
  robots: { index: false },
};

/**
 * TEMPORARY: design prototypes (profiles design step, 2026-11-02). Throwaway
 * screens with hard-coded fake data, so the designs render with the real
 * fonts and tokens. They exist only on feat/profiles and are deleted before
 * it merges to main; see docs/design/profiles.md for what gets built.
 *
 * A production build answers 404 for the whole /prototype tree, unless it's
 * started with SHOW_PROTOTYPES=1 (the LAN build for reviewing on a phone,
 * since the dev server blocks a phone's scripts).
 */
export default function PrototypeLayout({
  children,
}: LayoutProps<"/prototype">) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.SHOW_PROTOTYPES !== "1"
  ) {
    notFound();
  }
  return children;
}
