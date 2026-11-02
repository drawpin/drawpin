import { shellProps } from "../_proto/params";
import { DrawPageBody } from "../_proto/pages";
import { AppShell } from "../_proto/shell";

/** PROTOTYPE: the draw page, where the menu is only the button. */
export default async function ProtoDraw({
  searchParams,
}: PageProps<"/prototype/profiles/draw">) {
  return (
    <AppShell {...shellProps(await searchParams)} persistent={false}>
      <DrawPageBody />
    </AppShell>
  );
}
