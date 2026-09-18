"use server";

import { revalidatePath } from "next/cache";
import { castVotes, type CastVotesFailure } from "./cast-votes";
import { getCustomer } from "@/lib/customer";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkTurnstile } from "@/lib/turnstile/guard";
import { TURNSTILE_FIELD } from "@/lib/turnstile/field";
import { SupabaseVoteStore } from "./supabase-vote-store";
import { type VoteState, castVotesSchema } from "./schema";

const FAILURE_MESSAGES: Record<CastVotesFailure, string> = {
  "not-voting": "Voting isn't open on this board right now.",
  "none-chosen": "Pick at least one drawing first.",
  "no-votes-left": "You've used all three of your votes this week.",
  "too-many": "That's more votes than you have left this week.",
  "not-votable":
    "One of those can't be voted for. Reload the page and try again.",
  closed: "Voting just closed for that week.",
  "already-used": "You've already voted for one of those.",
  failed: "Something went wrong saving your votes. Try again.",
};

/** Casts the votes a visitor picked on last week's board. */
export async function castVotesAction(
  _previous: VoteState,
  formData: FormData,
): Promise<VoteState> {
  const parsed = castVotesSchema.safeParse({
    slug: formData.get("slug"),
    tileIds: formData.getAll("tileIds"),
  });
  if (!parsed.success) {
    return { status: "error", message: FAILURE_MESSAGES["none-chosen"] };
  }

  // Before anything is written, the same way posting works.
  const challenge = await checkTurnstile(formData.get(TURNSTILE_FIELD));
  if (challenge) return { status: "error", message: challenge };

  const admin = createAdminClient();
  const customer = await getCustomer(admin);
  if (!customer) {
    return {
      status: "error",
      message: "Sign in to vote. Your drawing can stay anonymous.",
    };
  }

  try {
    const result = await castVotes(
      {
        slug: parsed.data.slug,
        userId: customer.id,
        tileIds: parsed.data.tileIds,
      },
      new SupabaseVoteStore(admin),
    );

    if (!result.ok) {
      return { status: "error", message: FAILURE_MESSAGES[result.reason] };
    }

    // The screen shows how many votes are left, and they've just changed.
    revalidatePath(`/b/${parsed.data.slug}/vote`);
    return { status: "cast", votesLeft: result.votesLeft };
  } catch (error) {
    console.error("castVotesAction failed", error);
    return { status: "error", message: FAILURE_MESSAGES.failed };
  }
}
