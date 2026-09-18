import { z } from "zod";

export const finalVoteSchema = z.object({
  slug: z.string().min(1),
  tileId: z.guid(),
});

export type FinalVoteState =
  | { status: "idle" }
  | { status: "cast" }
  | { status: "error"; message: string };
