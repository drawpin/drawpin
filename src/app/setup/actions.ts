"use server";

import { redirect } from "next/navigation";
import { adminPath } from "@/app/admin/board-field";
import { requireOwner } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { MAX_BOARDS_PER_ACCOUNT, ownedBoardCount } from "@/lib/my-boards";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseMyBoardsStore } from "@/lib/supabase-my-boards";
import { moderateVenueName } from "@/lib/venue-name";
import {
  BOARD_LIMIT_MESSAGE,
  createVenue,
  type CreateVenueResult,
} from "./create-venue";
import { ensureOwnerRow } from "./ensure-owner-row";
import { type SetupState, setupSchema } from "./schema";

const FAILED: SetupState = {
  status: "error",
  message: "We couldn't create your board. Try again in a moment.",
};

/**
 * Creates a board for the signed-in account from the setup form, then opens
 * its owner screen. Any signed-in account can, including one that draws
 * (ADR-013), up to {@link MAX_BOARDS_PER_ACCOUNT} boards (ADR-016).
 */
export async function createVenueAction(
  _previous: SetupState,
  formData: FormData,
): Promise<SetupState> {
  const owner = await requireOwner();
  const admin = createAdminClient();

  const parsed = setupSchema.safeParse({
    name: formData.get("name"),
    timezone: formData.get("timezone"),
    moderationLevel: formData.get("moderationLevel"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  // Checked before the name goes to moderation, which costs a request. The
  // database trigger is what holds if two submits race past this.
  let count: number;
  try {
    count = await ownedBoardCount(owner.id, supabaseMyBoardsStore(admin));
  } catch (error) {
    console.error("createVenueAction: board count failed", error);
    return FAILED;
  }
  if (count >= MAX_BOARDS_PER_ACCOUNT) {
    return { status: "error", message: BOARD_LIMIT_MESSAGE };
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
  let result: CreateVenueResult;
  try {
    // `venues.owner_id` references it, and signing in no longer creates one.
    await ensureOwnerRow(owner, async (row) =>
      admin.from("owners").upsert(row, { onConflict: "id" }),
    );

    result = await createVenue(
      { ownerId: owner.id, ...parsed.data },
      async (row) => admin.from("venues").insert(row),
    );
  } catch (error) {
    console.error("createVenue failed", error);
    return FAILED;
  }

  if (result.status === "limit-reached") {
    return { status: "error", message: BOARD_LIMIT_MESSAGE };
  }
  redirect(adminPath(result.slug));
}
