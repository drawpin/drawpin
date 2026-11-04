import type { Metadata } from "next";
import { MarketingHome } from "../_home/marketing-home";

export const metadata: Metadata = {
  title: "About · DrawPin",
  description:
    "Scan a code, draw a tile, and vote for the week's best. A shared drawing board for any group.",
  // The same page as the signed-out `/`, so search engines keep `/`.
  alternates: { canonical: "/" },
};

/**
 * The marketing home at its own address (the sidebar's "About"), so a
 * signed-in person landing on the hub can still show a friend what DrawPin
 * is (docs/design/profiles.md, section 3).
 */
export default function AboutPage() {
  return <MarketingHome />;
}
