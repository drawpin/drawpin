import { z } from "zod";

/** Fixed choices, so there's no free text for the owner to read or moderate. */
export const REPORT_REASONS = [
  { value: "offensive", label: "Hateful or offensive" },
  { value: "sexual", label: "Sexual" },
  { value: "violent", label: "Violent" },
  { value: "spam", label: "Spam or an advert" },
  { value: "other", label: "Something else" },
] as const;

export const reportTileSchema = z.object({
  tileId: z.guid(),
  reason: z.enum(REPORT_REASONS.map((reason) => reason.value)),
});

export type ReportState =
  | { status: "idle" }
  | { status: "reported" }
  | { status: "error"; message: string };
