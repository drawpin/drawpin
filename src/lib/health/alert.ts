import { CONTACT_EMAIL } from "@/lib/legal";
import type { HealthReport } from "./checks";

const TIMEOUT_MS = 5_000;
const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** The address a failed check is sent from and to. */
const FROM = `DrawPin <${CONTACT_EMAIL}>`;

/** Turns a report into the plain text of the email. */
export function alertBody(report: HealthReport): string {
  const lines = report.checks.map(
    (check) =>
      `${check.ok ? "ok" : "FAILED"}  ${check.name}${check.detail ? ` — ${check.detail}` : ""}`,
  );

  return [
    "A DrawPin dependency stopped answering.",
    "",
    ...lines,
    "",
    "Posting is refused while moderation or Turnstile are unreachable, so the",
    "board stays up and nobody can draw on it.",
    "",
    "https://drawpin.io/api/health",
  ].join("\n");
}

/**
 * Emails when a daily health check fails (issue #64).
 *
 * The failures this covers are the quiet ones — an expired OpenAI key, a
 * mistyped Turnstile secret — where the site stays up and every post is
 * refused. A cron that returns 503 records the problem; nobody is watching the
 * dashboard, so it also has to arrive somewhere a person reads.
 *
 * Sent through Resend, which already sends the sign-in emails, to the contact
 * address the policy pages publish. No second vendor, and one failed check a
 * day is far inside the free tier.
 *
 * @param apiKey - Resend key; without one this does nothing, so a deployment
 *   that hasn't been given one still runs its checks.
 * @returns `null` when sent or deliberately skipped, or what went wrong, which
 *   the caller logs rather than throws: a check that failed to report is not a
 *   reason to fail the check run itself.
 */
export async function sendHealthAlert(
  report: HealthReport,
  apiKey: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  if (!apiKey) return null;

  const failed = report.checks.filter((check) => !check.ok).map((c) => c.name);

  try {
    const response = await fetchImpl(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [CONTACT_EMAIL],
        subject: `DrawPin health check failed: ${failed.join(", ")}`,
        text: alertBody(report),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    return response.ok ? null : `Resend returned HTTP ${response.status}`;
  } catch (error) {
    return error instanceof Error ? error.message : "send threw";
  }
}
