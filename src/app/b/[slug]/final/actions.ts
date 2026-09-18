"use server";

import { revalidatePath } from "next/cache";
import { getCustomer } from "@/lib/customer";
import { openFinal } from "@/lib/monthly-final";
import { createAdminClient } from "@/lib/supabase/admin";
import { TURNSTILE_FIELD } from "@/lib/turnstile/field";
import { checkTurnstile } from "@/lib/turnstile/guard";
import { getBoard } from "../data";
import { ensureFinal, listWeekTimings } from "./data";
import { type FinalVoteState, finalVoteSchema } from "./schema";

const UNIQUE_VIOLATION = "23505";

/** Casts an account's single vote in this month's final. */
export async function castFinalVoteAction(
  _previous: FinalVoteState,
  formData: FormData,
): Promise<FinalVoteState> {
  const parsed = finalVoteSchema.safeParse({
    slug: formData.get("slug"),
    tileId: formData.get("tileId"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Pick a drawing first." };
  }

  const challenge = await checkTurnstile(formData.get(TURNSTILE_FIELD));
  if (challenge) return { status: "error", message: challenge };

  const admin = createAdminClient();
  const customer = await getCustomer(admin);
  if (!customer) {
    return { status: "error", message: "Sign in to vote in the final." };
  }

  const board = await getBoard(parsed.data.slug);
  if (!board) {
    return { status: "error", message: "This board doesn't exist anymore." };
  }

  const weeks = await listWeekTimings(admin, board.id);
  const window = openFinal(weeks, board.timezone, new Date());
  if (!window) {
    return { status: "error", message: "No final is running right now." };
  }

  const finalId = await ensureFinal(admin, board.id, window);
  const { error } = await admin.from("final_votes").insert({
    final_id: finalId,
    tile_id: parsed.data.tileId,
    user_id: customer.id,
  });

  if (error) {
    // One vote per account is the table's own rule, so a repeat lands here.
    if (error.code === UNIQUE_VIOLATION) {
      return {
        status: "error",
        message: "You've already voted in this month's final.",
      };
    }
    if (error.message.includes("cannot vote on its own tile")) {
      return { status: "error", message: "You can't vote for your own tile." };
    }
    if (error.message.includes("has closed")) {
      return { status: "error", message: "This final has just closed." };
    }
    if (error.message.includes("not a finalist")) {
      return {
        status: "error",
        message: "That drawing isn't in the final. Reload and try again.",
      };
    }

    console.error("castFinalVoteAction failed", error);
    return {
      status: "error",
      message: "Something went wrong saving your vote. Try again.",
    };
  }

  revalidatePath(`/b/${parsed.data.slug}/final`);
  return { status: "cast" };
}
