import { type NextRequest, NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { runCleanup } from "./purge";
import { SupabaseCleanupStore } from "./supabase-cleanup-store";

/** Long enough for a venue's backlog; Vercel's Hobby limit is 60 seconds. */
export const maxDuration = 60;

/**
 * The daily cleanup (ADR-003, docs/PLAN.md Data retention).
 *
 * Vercel Cron calls this once a day with the project's `CRON_SECRET` as a
 * bearer token. Anything without it is refused: the endpoint deletes things.
 */
export async function GET(request: NextRequest) {
  const secret = serverEnv().CRON_SECRET;
  if (!secret) {
    console.error("Cleanup was called but CRON_SECRET isn't set");
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const summary = await runCleanup({
    store: new SupabaseCleanupStore(createAdminClient()),
    now: () => new Date(),
    logError: console.error,
  });

  console.log("Cleanup finished", summary);
  return NextResponse.json(summary);
}
