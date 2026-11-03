import { LogoHarness } from "./harness";
import { VARIANTS } from "./variants";

/**
 * TEMPORARY prototype (2026-11-02): how the DrawPin logo sits on the site,
 * four directions behind a picker. Keys 1–4 or ←/→ switch, R replays; the
 * pick is kept in `?v=`. Deleted with the rest of /prototype before
 * feat/profiles merges.
 */
export default async function LogoPrototype({
  searchParams,
}: PageProps<"/prototype/logo">) {
  const v = Number((await searchParams).v);
  const initial = v >= 1 && v <= VARIANTS.length ? v - 1 : 0;
  return <LogoHarness initial={initial} />;
}
