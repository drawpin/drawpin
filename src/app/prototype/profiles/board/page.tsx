import { shellProps } from "../_proto/params";
import { BoardPageBody } from "../_proto/pages";
import { AppShell } from "../_proto/shell";

/** PROTOTYPE: a board page inside the shell; the sidebar variants' backdrop. */
export default async function ProtoBoard({
  searchParams,
}: PageProps<"/prototype/profiles/board">) {
  return (
    <AppShell {...shellProps(await searchParams)} current="board">
      <BoardPageBody />
    </AppShell>
  );
}
