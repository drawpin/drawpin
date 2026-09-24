"use server";

import { redirect } from "next/navigation";
import { isOwnerAccount, requireOwner } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { moderateVenueName } from "@/lib/venue-name";
import { createVenue } from "./create-venue";
import { ensureOwnerRow } from "./ensure-owner-row";
import { type SetupState, setupSchema } from "./schema";

/** Creates the signed-in owner's board from the setup form. */
export async function createVenueAction(
  _previous: SetupState,
  formData: FormData,
): Promise<SetupState> {
  const owner = await requireOwner();
  // A customer's Google account can reach this action as easily as the page.
  if (!isOwnerAccount(owner)) redirect("/");

  const parsed = setupSchema.safeParse({
    name: formData.get("name"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  // Anyone who can receive email reaches this form, and the name they type
  // becomes the board's heading, its page title, its link-preview title and
  // the URL itself — so it is checked here as well as in the rename form.
  const check = await moderateVenueName(parsed.data.name, serverEnv());
  if (check.status === "refused") {
    return { status: "error", message: check.message };
  }

  // Venues have no insert policy; writes go through the service role after
  // the owner check above (docs/ERD.md, Row level security).
  const admin = createAdminClient();

  try {
    // `venues.owner_id` references it, and signing in no longer creates one.
    await ensureOwnerRow(owner, async (row) =>
      admin.from("owners").upsert(row, { onConflict: "id" }),
    );

    await createVenue({ ownerId: owner.id, ...parsed.data }, async (row) =>
      admin.from("venues").insert(row),
    );
  } catch (error) {
    console.error("createVenue failed", error);
    return {
      status: "error",
      message: "We couldn't create your board. Try again in a moment.",
    };
  }

  redirect("/admin");
}
