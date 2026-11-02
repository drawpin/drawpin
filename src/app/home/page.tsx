import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LANDING } from "@/lib/landing";
import { HomeHub, loadHubViewer } from "../_hub/home-hub";

export const metadata: Metadata = {
  title: "Home · DrawPin",
  robots: { index: false },
};

/**
 * The hub at its own address, for when `LANDING` is `"marketing"` and `/` is
 * the marketing home for everyone; the sidebar's "Home" comes here then.
 * While the hub is the landing, this is just `/`.
 */
export default async function HubPage() {
  if (LANDING === "hub") redirect("/");

  const viewer = await loadHubViewer();
  if (!viewer.userId) redirect("/");
  if (!viewer.username) redirect("/welcome?next=/home");
  return <HomeHub userId={viewer.userId} name={viewer.username} />;
}
