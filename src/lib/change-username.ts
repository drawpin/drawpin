import { usernameSchema } from "@/app/welcome/schema";

/** What the change-name form shows next. */
export type ChangeNameState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "error"; message: string };

/** What changing a name needs from outside. */
export type ChangeNameDeps = {
  /** The message to show if the name isn't allowed, else `null`. */
  problem(username: string): Promise<string | null>;
  save(username: string): Promise<void>;
};

/**
 * Changes an account's username, with the checks picking one has
 * (`/welcome`): the same Zod schema, then moderation at All Ages. Naming
 * yourself what you're already called is a quiet success, with no
 * moderation call spent.
 *
 * @param raw - The form field, untrusted.
 * @param current - The name the account has now.
 */
export async function changeUsername(
  raw: unknown,
  current: string,
  deps: ChangeNameDeps,
): Promise<ChangeNameState> {
  const parsed = usernameSchema.safeParse({ username: raw });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  const { username } = parsed.data;
  if (username === current) return { status: "saved" };

  const problem = await deps.problem(username);
  if (problem) return { status: "error", message: problem };

  try {
    await deps.save(username);
  } catch (error) {
    console.error("Could not change the username", error);
    return {
      status: "error",
      message: "We couldn't save that name. Try again in a moment.",
    };
  }
  return { status: "saved" };
}
