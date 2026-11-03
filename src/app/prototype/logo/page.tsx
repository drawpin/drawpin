import { LogoHarness } from "./harness";

/**
 * TEMPORARY prototype (2026-11-02): how the DrawPin logo sits on the site,
 * four directions behind a picker. Keys 1–4 or ←/→ switch, R replays; the
 * pick is kept in `?v=`. Deleted with the rest of /prototype before
 * feat/profiles merges.
 */
export default async function LogoPrototype({
  searchParams,
}: PageProps<"/prototype/logo">) {
  // The harness clamps it: the variant list lives on the client.
  const v = Number((await searchParams).v) || 1;
  return <LogoHarness initial={v - 1} />;
}
