"use server";

import { redirect } from "next/navigation";
import { nameTagFor } from "@/lib/device-id";
import { ensureDeviceId } from "@/lib/device";
import { serverEnv } from "@/lib/env";
import { TURNSTILE_FIELD } from "@/lib/turnstile/field";
import { parseBlocklist } from "@/lib/moderation/blocklist";
import { moderateTile } from "@/lib/moderation/moderate-tile";
import { checkTurnstile } from "@/lib/turnstile/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { processTileImage } from "@/lib/tile-image";
import { type PostTileFailure, postTile } from "./post-tile";
import { type PostTileState, postTileFormSchema } from "./schema";
import { SupabaseTileStore } from "./supabase-tile-store";

const FAILURE_MESSAGES: Record<PostTileFailure, string> = {
  "not-found": "This board doesn't exist anymore.",
  paused: "This board is paused, so posting is off right now.",
  "invalid-image": "We couldn't read your drawing. Try again.",
  blank: "Draw something first.",
  blocked: "This couldn't be posted. It didn't use up your post for today.",
  locked:
    "Too many posts couldn't be posted today. You can try again after 4:00 AM.",
  "moderation-unavailable":
    "We couldn't check your drawing right now. Try again in a minute — this didn't use up your post.",
  "week-closed": "Posting is closed for this week.",
  "already-posted":
    "You've already posted today. You can post again after 4:00 AM.",
  failed: "Something went wrong saving your tile. Try again.",
};

/** Posts the visitor's drawing to the board, then returns them to the feed. */
export async function postTileAction(
  _previous: PostTileState,
  formData: FormData,
): Promise<PostTileState> {
  const parsed = postTileFormSchema.safeParse({
    slug: formData.get("slug"),
    displayName: formData.get("displayName"),
    caption: formData.get("caption"),
    image: formData.get("image"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  // Before creating a device, moderating, or touching storage.
  const challenge = await checkTurnstile(formData.get(TURNSTILE_FIELD));
  if (challenge) return { status: "error", message: challenge };

  const { slug, displayName, caption, image } = parsed.data;
  const admin = createAdminClient();

  try {
    const deviceId = await ensureDeviceId(admin);
    const env = serverEnv();
    const secret = env.DEVICE_COOKIE_SECRET;
    const blockedTerms = parseBlocklist(env.MODERATION_BLOCKLIST);

    const result = await postTile(
      {
        slug,
        deviceId,
        displayName,
        caption,
        image: new Uint8Array(await image.arrayBuffer()),
      },
      {
        store: new SupabaseTileStore(admin),
        processImage: processTileImage,
        moderate: (content) =>
          moderateTile(content, { apiKey: env.OPENAI_API_KEY, blockedTerms }),
        nameTag: (id, name) => nameTagFor(id, name, secret),
        newId: () => crypto.randomUUID(),
        now: () => new Date(),
        logError: console.error,
      },
    );

    if (!result.ok) {
      return { status: "error", message: FAILURE_MESSAGES[result.reason] };
    }
  } catch (error) {
    console.error("postTileAction failed", error);
    return { status: "error", message: FAILURE_MESSAGES.failed };
  }

  redirect(`/b/${slug}`);
}
