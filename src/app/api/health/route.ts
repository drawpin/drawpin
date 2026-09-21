import { NextResponse } from "next/server";
import { checkDatabase } from "@/lib/health/supabase";
import { runChecks } from "@/lib/health/checks";
import { createAdminClient } from "@/lib/supabase/admin";

/** Public, so an uptime pinger can watch it; cheap, so it can be watched often. */
export const dynamic = "force-dynamic";

/**
 * Is DrawPin up?
 *
 * One database round trip and nothing else: no third-party calls, no counts,
 * nothing about anyone's data. The deep checks that cost something live behind
 * the cron secret in `/api/cron/health`.
 */
export async function GET() {
  const admin = createAdminClient();
  const report = await runChecks({
    database: () => checkDatabase(admin),
  });

  return NextResponse.json(report, { status: report.ok ? 200 : 503 });
}
