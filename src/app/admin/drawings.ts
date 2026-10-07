/** A drawing on the owner's screen. */
export type AdminTile = {
  id: string;
  author: string | null;
  /** Posted by an account, which the owner can block (ADR-008). */
  canBlock: boolean;
  caption: string | null;
  imageUrl: string;
};

/** A tile customers have flagged, with what they said about it. */
export type ReportedTile = AdminTile & {
  reportCount: number;
  /** The distinct reasons given, most recent first. */
  reasons: string[];
};

/**
 * A drawing in the owner's drawings section: this week's, or a reported one
 * from any week.
 */
export type OwnerDrawing = AdminTile & {
  /** Open reports on it, when there are any. */
  reports?: { count: number; reasons: string[] };
  /** Posted in an earlier week: only reported drawings reach back that far. */
  earlier?: boolean;
};

const REASON_LABELS: Record<string, string> = {
  offensive: "hateful or offensive",
  sexual: "sexual",
  violent: "violent",
  spam: "spam",
  other: "something else",
};

/** What a reported drawing's reports say, like "2 reports: spam, sexual". */
export function reportLine(reports: {
  count: number;
  reasons: string[];
}): string {
  const reasons = reports.reasons
    .map((reason) => REASON_LABELS[reason] ?? reason)
    .join(", ");
  return `${reports.count} ${reports.count === 1 ? "report" : "reports"}: ${reasons}`;
}

/**
 * This week's drawings and the reported ones as the owner's two views of
 * them. Every week's drawing that has reports carries them, and the reported
 * view holds every reported drawing, most reported first, including any from
 * an earlier week that this week's list doesn't have: a drawing can be
 * reported long after its week, and none may go missing from the owner's
 * screen.
 */
export function combineDrawings(
  week: readonly AdminTile[],
  reported: readonly ReportedTile[],
): { all: OwnerDrawing[]; reported: OwnerDrawing[] } {
  const reportsById = new Map(
    reported.map((tile) => [
      tile.id,
      { count: tile.reportCount, reasons: tile.reasons },
    ]),
  );
  const weekIds = new Set(week.map((tile) => tile.id));

  const withReports = (tile: AdminTile): OwnerDrawing => {
    const reports = reportsById.get(tile.id);
    return reports ? { ...tile, reports } : { ...tile };
  };

  return {
    all: week.map(withReports),
    reported: reported.map(({ reportCount, reasons, ...tile }) => ({
      ...tile,
      reports: { count: reportCount, reasons },
      ...(weekIds.has(tile.id) ? {} : { earlier: true }),
    })),
  };
}
