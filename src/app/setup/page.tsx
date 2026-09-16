import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listTimeZones } from "@/lib/timezones";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Set up your board · DrawPin" };

export default async function SetupPage() {
  const owner = await requireOwner();

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
          Customers will see your venue name when they scan your QR code.
        </p>
      </div>
      <SetupForm timeZones={listTimeZones()} />
    </main>
  );
}
