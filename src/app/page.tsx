import { LANDING, landingFor } from "@/lib/landing";
import { HomeHub, loadHubViewer } from "./_hub/home-hub";
import { MarketingHome } from "./_home/marketing-home";

/**
 * `/`: the home hub for a signed-in account with a name, the marketing home
 * for everyone else. `LANDING` in src/lib/landing.ts switches the hub off,
 * and then nobody's session is read here at all.
 */
export default async function Home() {
  if (LANDING === "marketing") return <MarketingHome />;

  const viewer = await loadHubViewer();
  const landing = landingFor({
    signedIn: viewer.userId !== null,
    hasUsername: viewer.username !== null,
  });
  if (landing === "hub" && viewer.userId && viewer.username) {
    return <HomeHub userId={viewer.userId} name={viewer.username} />;
  }
  return <MarketingHome />;
}
