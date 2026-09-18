"use server";

import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { parseBlocklist } from "@/lib/moderation/blocklist";
import { moderateTile } from "@/lib/moderation/moderate-tile";
import { ModerationUnavailableError } from "@/lib/moderation/openai";
import { serverEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/next-path";
import { createAdminClient } from "@/lib/supabase/admin";
import { type WelcomeState, usernameSchema } from "./schema";

/** Saves the username a new customer picked, then returns them to the board. */
export async function chooseUsername(
  _previous: WelcomeState,
  formData: FormData,
): Promise<WelcomeState> {
  const user = await requireOwner();

  const parsed = usernameSchema.safeParse({
    username: formData.get("username"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  const { username } = parsed.data;
  const env = serverEnv();

  // A username is shown on every tile this account posts, so it goes through
  // the same check as a caption (docs/PLAN.md, Moderation).
  try {
    const decision = await moderateTile(
      { displayName: username, caption: null, image: null },
      {
        apiKey: env.OPENAI_API_KEY,
        blockedTerms: parseBlocklist(env.MODERATION_BLOCKLIST),
      },
    );
    if (!decision.allowed) {
      return { status: "error", message: "Pick a different name." };
    }
  } catch (error) {
    if (error instanceof ModerationUnavailableError) {
      return {
        status: "error",
        message:
          "We couldn't check that name right now. Try again in a minute.",
      };
    }
    throw error;
  }

  const { error } = await createAdminClient()
    .from("profiles")
    .upsert({ id: user.id, username }, { onConflict: "id" });

  if (error) {
    console.error("Could not save the profile", error);
    return {
      status: "error",
      message: "We couldn't save that name. Try again in a moment.",
    };
  }

  redirect(safeNextPath(formData.get("next") as string | null));
}
