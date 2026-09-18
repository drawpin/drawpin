import { z } from "zod";

export const castVotesSchema = z.object({
  slug: z.string().min(1),
  // guid, not uuid: accepts any id Postgres' uuid type does.
  tileIds: z.array(z.guid()).min(1).max(3),
});

export type VoteState =
  | { status: "idle" }
  | { status: "cast"; votesLeft: number }
  | { status: "error"; message: string };
