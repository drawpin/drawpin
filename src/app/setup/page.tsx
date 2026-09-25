import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOut } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { isOwnerAccount, requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listTimeZones } from "@/lib/timezones";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Set up your board · DrawPin" };

export default async function SetupPage() {
  const owner = await requireOwner();
  // Customers are signed in too (ADR-004); only owner accounts set up boards.
  if (!isOwnerAccount(owner)) redirect("/");

  const supabase = await createClient();
  const { data: venue, error } = await supabase
    .from("venues")
    .select("id")
    .eq("owner_id", owner.id)
    .maybeSingle();

  if (error) throw new Error(`Could not load venue: ${error.message}`);
  if (venue) redirect("/admin");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Set up your board
        </h1>
        <p className="text-muted-foreground text-sm">
          Everyone sees this name when they scan your code.
        </p>
      </div>
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
    </main>
  );
}
