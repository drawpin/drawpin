import { Ending } from "../../../_home/shared";
import { LogoSticker } from "../../logo/sticker";
import { ProtoPoster } from "../../topbar/parts";
import { shellProps } from "../_proto/params";
import { AppShell, MenuButton } from "../_proto/shell";

/**
 * PROTOTYPE: landing 2, today's marketing home page with the sidebar added.
 * On a phone the logo sticker is pinned over the poster's top edge and the
 * menu button sits in the poster's top-right corner (no row of its own).
 */
export default async function ProtoHome({
  searchParams,
}: PageProps<"/prototype/profiles/home">) {
  const query = await searchParams;
  return (
    <AppShell {...shellProps({ who: "out", ...query })}>
      <div className="flex flex-1 flex-col bg-white">
        <ProtoPoster
          sticker={<LogoSticker href="/prototype/profiles/hub" />}
          top={
            <div className="-mr-2 flex justify-end lg:hidden">
              <MenuButton />
            </div>
          }
        />
        <Ending />
      </div>
    </AppShell>
  );
}
