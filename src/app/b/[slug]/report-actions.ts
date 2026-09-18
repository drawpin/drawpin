"use server";

import { getCustomer } from "@/lib/customer";
import { createAdminClient } from "@/lib/supabase/admin";
import { type ReportState, reportTileSchema } from "./report-schema";

const OUTCOMES: Record<string, ReportState> = {
  recorded: { status: "reported" },
  "already-reported": {
    status: "error",
    message: "You've already reported this one. The owner can see it.",
  },
  "rate-limited": {
    status: "error",
    message: "That's a lot of reports today. Try again tomorrow.",
  },
};

/**
 * Flags a tile for the venue's owner.
 *
 * A report is a flag, not a takedown: the tile stays on the board until the
 * owner acts, so a handful of accounts can't bury a drawing they dislike
 * (docs/PLAN.md, Moderation).
 */
export async function reportTileAction(
  _previous: ReportState,
  formData: FormData,
): Promise<ReportState> {
  const parsed = reportTileSchema.safeParse({
    tileId: formData.get("tileId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Pick a reason first." };
  }

  const admin = createAdminClient();
  const customer = await getCustomer(admin);
  if (!customer) {
    return { status: "error", message: "Sign in to report a drawing." };
  }

  const { data, error } = await admin.rpc("record_tile_report", {
    p_tile_id: parsed.data.tileId,
    p_user_id: customer.id,
    p_reason: parsed.data.reason,
  });

  if (error) {
    console.error("reportTileAction failed", error);
    return {
      status: "error",
      message: "We couldn't send that report. Try again in a moment.",
    };
  }

  return (
    OUTCOMES[data] ?? {
      status: "error",
      message: "We couldn't send that report. Try again in a moment.",
    }
  );
}
