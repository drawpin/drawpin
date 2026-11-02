import { shellProps } from "../_proto/params";
import { BoardPageBody } from "../_proto/pages";
import { AppShell } from "../_proto/shell";
import { SignInSheet } from "../_proto/sign-in-sheet";

/**
 * PROTOTYPE: the universal sign-in sheet, opened from the sidebar over a
 * board page by someone signed out. `?step=code` is its second step.
 */
export default async function ProtoSignIn({
  searchParams,
}: PageProps<"/prototype/profiles/sign-in">) {
  const query = await searchParams;
  return (
    <AppShell {...shellProps({ ...query, who: "out" })}>
      <BoardPageBody />
      <SignInSheet step={query.step === "code" ? "code" : "start"} />
    </AppShell>
  );
}
