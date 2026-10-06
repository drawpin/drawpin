/**
 * Feedback from the home page goes to the project's public GitHub issues:
 * the form builds a link to a new issue, filled in, which the person posts
 * from their own GitHub account. Nothing is stored by DrawPin itself.
 */

/** Where new issues are opened. */
export const ISSUES_URL = "https://github.com/drawpin/drawpin/issues/new";

/** The kinds of feedback, each with the issue template that labels it. */
export const FEEDBACK_KINDS = {
  idea: { label: "Idea", template: "idea.md", prefix: "Idea" },
  bug: { label: "Bug", template: "bug.md", prefix: "Bug" },
  other: { label: "Something else", template: "other.md", prefix: "Feedback" },
} as const;

export type FeedbackKind = keyof typeof FEEDBACK_KINDS;

/** Longest title and details accepted, so the link stays a sensible length. */
export const TITLE_MAX = 100;
export const DETAILS_MAX = 2000;

/**
 * The link to a new GitHub issue for this feedback: the kind's template
 * (which adds its label), the title with the kind in front, and the details
 * with a note on where it came from. Returns null when there's no title.
 * Over-long text is cut to the limits above.
 */
export function feedbackIssueUrl({
  kind,
  title,
  details,
}: {
  kind: FeedbackKind;
  title: string;
  details: string;
}): string | null {
  const cleanTitle = title.trim().slice(0, TITLE_MAX);
  if (!cleanTitle) return null;
  const cleanDetails = details.trim().slice(0, DETAILS_MAX);
  const { template, prefix } = FEEDBACK_KINDS[kind];

  const body = [
    cleanDetails || "_No details given._",
    "",
    "---",
    "Sent from the feedback form on the DrawPin home page.",
  ].join("\n");

  const params = new URLSearchParams({
    template,
    title: `[${prefix}] ${cleanTitle}`,
    body,
  });
  return `${ISSUES_URL}?${params.toString()}`;
}
