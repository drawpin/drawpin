import type { Metadata } from "next";
import { CardPage } from "@/app/b/[slug]/board-look";
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
    <CardPage
      note="Welcome!"
      title="You're in the running"
      intro={
        <p>
          Signed in, so your drawings can be voted for and you can vote on last
          week&apos;s board.
        </p>
      }
    >
      <WelcomeForm
        next={destination}
        suggestion={suggestedName(user.user_metadata ?? {})}
      />
    </CardPage>
  );
}
