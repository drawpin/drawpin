"use server";

import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createVenue } from "./create-venue";
import { type SetupState, setupSchema } from "./schema";

/** Creates the signed-in owner's board from the setup form. */
export async function createVenueAction(
  _previous: SetupState,
  formData: FormData,
): Promise<SetupState> {
  const owner = await requireOwner();

  const parsed = setupSchema.safeParse({
    name: formData.get("name"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  // Venues have no insert policy; writes go through the service role after
  // the owner check above (docs/ERD.md, Row level security).
  const admin = createAdminClient();

  try {
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
