import { PosterHero } from "../../../_home/poster-hero";
import { Ending } from "../../../_home/shared";
import { shellProps } from "../_proto/params";
import { AppShell, MenuButton } from "../_proto/shell";

/**
 * PROTOTYPE: landing 2, today's marketing home page with the sidebar added.
 * The poster has no header row of its own, so on a phone a slim white bar
 * above it carries the menu button.
 */
export default async function ProtoHome({
  searchParams,
}: PageProps<"/prototype/profiles/home">) {
  const query = await searchParams;
  return (
    <AppShell {...shellProps({ who: "out", ...query })}>
      <div className="flex items-center gap-2 px-3 pt-3 lg:hidden">
        <MenuButton tone="white" />
        <span className="text-xl font-black tracking-tighter">
          Draw<span className="text-primary">Pin</span>
        </span>
      </div>
      <div className="flex flex-1 flex-col bg-white">
        <PosterHero />
        <Ending />
      </div>
    </AppShell>
  );
}
