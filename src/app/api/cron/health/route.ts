import { type NextRequest, NextResponse } from "next/server";
import { sendHealthAlert } from "@/lib/health/alert";
import { runChecks } from "@/lib/health/checks";
import {
  checkOpenAiKey,
  checkTurnstileSecret,
} from "@/lib/health/dependencies";
import { checkDatabase, checkStorage } from "@/lib/health/supabase";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The daily check that every dependency still accepts us (issue #64).
 *
 * Each of these failures is silent in normal use: an expired OpenAI key or a
 * mistyped Turnstile secret refuses every post, which from the outside is
 * indistinguishable from a quiet evening. Running it as a cron turns that into
 * a failed run on Vercel's dashboard.
 *
 * Behind the cron secret because it spends other people's rate limits.
 */
export async function GET(request: NextRequest) {
  const env = serverEnv();
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const report = await runChecks({
    database: () => checkDatabase(admin),
    storage: () => checkStorage(admin),
    openai: () => checkOpenAiKey(env.OPENAI_API_KEY),
    turnstile: () => checkTurnstileSecret(env.TURNSTILE_SECRET_KEY),
  });

  if (!report.ok) {
    console.error("Health check failed", report.checks);
    // Nobody watches a cron dashboard, so the failure has to arrive somewhere
    // a person reads. Failing to send is logged, not thrown: the check result
    // matters more than the reporting of it.
    const problem = await sendHealthAlert(report, env.RESEND_API_KEY);
    if (problem) console.error("Could not send the health alert", problem);
  }

  // A non-200 is what makes Vercel's cron dashboard show it as a failure.
  return NextResponse.json(report, { status: report.ok ? 200 : 503 });
}
