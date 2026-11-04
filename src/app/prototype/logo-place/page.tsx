import { PlacementHarness } from "./harness";

/**
 * TEMPORARY prototype (2026-11-04): where the DrawPin logo lives on the
 * site, without a box of its own. Four placements behind a picker, on the
 * home page or the hub (the top pill, or P). Keys 1–4 or ←/→ switch, R
 * replays; `?v=` and `?page=` keep the pick. Deleted with the rest of
 * /prototype before feat/profiles merges.
 */
export default async function LogoPlacementPrototype({
  searchParams,
}: PageProps<"/prototype/logo-place">) {
  const query = await searchParams;
  // The harness clamps it: the placements live on the client.
  const v = Number(query.v) || 1;
  return (
    <PlacementHarness
      initial={v - 1}
      initialPage={query.page === "hub" ? 1 : 0}
    />
  );
}
