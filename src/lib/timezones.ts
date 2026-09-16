/**
 * Lists the IANA time zones a venue can pick from, e.g. `America/Chicago`.
 * Venue time zones decide when each day and week resets (4:00 AM local), so
 * only real IANA names are accepted — not raw UTC offsets, which ignore DST.
 */
export function listTimeZones(): string[] {
  return Intl.supportedValuesOf("timeZone");
}

/** Whether `value` is one of the time zones returned by {@link listTimeZones}. */
export function isSupportedTimeZone(value: string): boolean {
  return listTimeZones().includes(value);
}
