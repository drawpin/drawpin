import type { Metadata } from "next";
import { CardPage } from "@/app/b/[slug]/board-look";
import { redirect } from "next/navigation";
import { signOut } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { canSetUpBoard, getAccount, requireOwner } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { listTimeZones } from "@/lib/timezones";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Set up your board · DrawPin" };

export default async function SetupPage() {
  const owner = await requireOwner();
  // Customers are signed in too (ADR-004); only owner accounts set up boards.
  // The login page tells a customer how to switch to a board account.
  const account = await getAccount(owner, createAdminClient());
  if (!canSetUpBoard(account.kind)) redirect("/login");

  const supabase = await createClient();
  const { data: venue, error } = await supabase
    .from("venues")
    .select("id")
    .eq("owner_id", owner.id)
    .maybeSingle();

  if (error) throw new Error(`Could not load venue: ${error.message}`);
  if (venue) redirect("/admin");

  return (
    <CardPage
      note="Nearly there!"
      title="Set up your board"
      intro={<p>Everyone sees this name when they scan your code.</p>}
    >
      <SetupForm timeZones={listTimeZones()} />
      {/* Signed in as the wrong address, this page is otherwise a dead end:
          every other route sends an owner without a board back to it. */}
      <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-1 text-sm">
        <span>Signed in as {owner.email}.</span>
        <form action={signOut}>
          <Button type="submit" variant="link" size="sm" className="h-auto p-0">
            Sign out
          </Button>
        </form>
      </div>
    </CardPage>
  );
}
