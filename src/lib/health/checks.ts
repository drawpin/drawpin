/** One thing that has to be true for DrawPin to work. */
export type HealthCheck = {
  name: string;
  ok: boolean;
  /** What went wrong, for the log. Never anything secret. */
  detail?: string;
};

export type HealthReport = {
  ok: boolean;
  checks: HealthCheck[];
};

/** Runs every check, so one failure doesn't hide the others. */
export async function runChecks(
  checks: Record<string, () => Promise<string | null>>,
): Promise<HealthReport> {
  const results = await Promise.all(
    Object.entries(checks).map(async ([name, check]): Promise<HealthCheck> => {
      try {
        const problem = await check();
        return problem
          ? { name, ok: false, detail: problem }
          : { name, ok: true };
      } catch (error) {
        return {
          name,
          ok: false,
          detail: error instanceof Error ? error.message : "check threw",
        };
      }
    }),
  );

  return { ok: results.every((result) => result.ok), checks: results };
}
