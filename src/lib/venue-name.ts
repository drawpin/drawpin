import { z } from "zod";
import { parseBlocklist } from "@/lib/moderation/blocklist";
import { moderateTile } from "@/lib/moderation/moderate-tile";
import { ModerationUnavailableError } from "@/lib/moderation/openai";
import { CONTACT_EMAIL } from "@/lib/legal";

/** Matches the `venues.name` check constraint (docs/ERD.md, venues). */
const MAX_LENGTH = 120;

/**
 * A venue name, as typed at setup or in the rename form.
 *
 * Control and bidi characters are rejected because this string is the `<h1>`
 * on five public pages, the browser tab title, and the `og:title` of the card
 * that lands in group chats — a right-to-left override in any of those garbles
 * the whole line. Internal whitespace collapses so "Corner   Coffee" and
 * "Corner Coffee" can't sit side by side as different venues.
 */
export const venueNameSchema = z
  .string()
  .trim()
  .transform((name) => name.replace(/\s+/g, " "))
  .refine((name) => name.length >= 1, {
    message: "Enter a name for your board.",
  })
  .refine((name) => name.length <= MAX_LENGTH, {
    message: `Keep the name under ${MAX_LENGTH} characters.`,
  })
  .refine((name) => !/\p{C}/u.test(name), {
    message: "That name contains characters we can't display.",
  });

/** What the rename and setup forms show when a name is refused. */
export const NAME_REFUSED_MESSAGE = `We couldn't accept that name. If that's your venue's real name, email us at ${CONTACT_EMAIL}.`;

/** What they show when the moderation service couldn't be reached. */
export const NAME_UNCHECKED_MESSAGE =
  "We couldn't check that name right now. Try again in a minute.";

export type VenueNameCheck =
  { status: "allowed" } | { status: "refused"; message: string };

/**
 * Runs a venue name through the same moderation a caption and username get
 * (docs/PLAN.md, Moderation).
 *
 * A venue name is the most visible text in the product — the heading on the
 * board, the page title, the link-preview title, and via `createBoardSlug` the
 * URL itself — and anyone who can receive email can create a board, so it is
 * checked in both places it can be set. Text only: there is no drawing here.
 *
 * Fails closed, like the username check: a name nobody could vet doesn't go up
 * on a public page. That means renames stop working while the OpenAI key is
 * unreachable, which is already true of posting.
 *
 * @param env - The OpenAI key and the private blocklist, from `serverEnv()`.
 */
export async function moderateVenueName(
  name: string,
  env: { OPENAI_API_KEY: string; MODERATION_BLOCKLIST?: string },
  moderate: typeof moderateTile = moderateTile,
): Promise<VenueNameCheck> {
  try {
    const decision = await moderate(
      { displayName: name, caption: null, image: null },
      {
        apiKey: env.OPENAI_API_KEY,
        blockedTerms: parseBlocklist(env.MODERATION_BLOCKLIST),
      },
    );

    return decision.allowed
      ? { status: "allowed" }
      : { status: "refused", message: NAME_REFUSED_MESSAGE };
  } catch (error) {
    if (error instanceof ModerationUnavailableError) {
      return { status: "refused", message: NAME_UNCHECKED_MESSAGE };
    }
    throw error;
  }
}
