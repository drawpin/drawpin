import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireOwner } from "@/lib/auth";
import { safeNextPath } from "@/lib/next-path";
import { createAdminClient } from "@/lib/supabase/admin";
import { WelcomeForm } from "./welcome-form";

export const metadata: Metadata = { title: "Pick a name · DrawPin" };

/** Google gives us a name; it's only ever a starting point. */
function suggestedName(metadata: Record<string, unknown>): string {
  const candidate = metadata.name ?? metadata.full_name;
  return typeof candidate === "string" ? candidate.slice(0, 40) : "";
}

export default async function WelcomePage({
  searchParams,
}: PageProps<"/welcome">) {
  await connection();

  const user = await requireOwner();
  const { next } = await searchParams;
  const destination = safeNextPath(typeof next === "string" ? next : null);

  const { data: profile, error } = await createAdminClient()
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error(`Could not load profile: ${error.message}`);
  // Already chosen: nothing to do here.
  if (profile) redirect(destination);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          You&apos;re in the running
        </h1>
        <p className="text-muted-foreground text-sm">
          Signed in, so your drawings can be voted for and you can vote on last
          week&apos;s board.
        </p>
      </div>

      <WelcomeForm
        next={destination}
        suggestion={suggestedName(user.user_metadata ?? {})}
      />
    </main>
  );
}
