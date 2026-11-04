import { serverEnv } from "@/lib/env";
import { parseBlocklist } from "@/lib/moderation/blocklist";
import { moderateTile } from "@/lib/moderation/moderate-tile";
import { ModerationUnavailableError } from "@/lib/moderation/openai";

/**
 * Checks a username before it's saved. A username is shown on every tile the
 * account posts, so it goes through the same check as a caption, at All Ages
 * (docs/PLAN.md, Moderation). Shared by picking a name (`/welcome`) and
 * changing it (`/me`).
 *
 * @returns The message to show the person, or `null` if the name is fine.
 */
export async function usernameProblem(
  username: string,
): Promise<string | null> {
  const env = serverEnv();
  try {
    const decision = await moderateTile(
      { displayName: username, caption: null, image: null },
      {
        apiKey: env.OPENAI_API_KEY,
        blockedTerms: parseBlocklist(env.MODERATION_BLOCKLIST),
      },
    );
    return decision.allowed ? null : "Pick a different name.";
  } catch (error) {
    if (error instanceof ModerationUnavailableError) {
      return "We couldn't check that name right now. Try again in a minute.";
    }
    throw error;
  }
}
