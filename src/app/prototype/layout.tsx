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
 * A production build answers 404 for the whole /prototype tree.
 */
export default function PrototypeLayout({
  children,
}: LayoutProps<"/prototype">) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
