// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GUESS_LIMIT,
  GUESS_WINDOW_MS,
  type JoinStore,
  joinWithCode,
  windowStartFor,
} from "./join";

/** An in-memory stand-in for the live codes and the guess counter. */
class FakeStore implements JoinStore {
  codes = new Map<string, { slug: string; from: Date; until: Date }>();
  guesses = new Map<string, number>();

  addLiveCode(code: string, slug: string) {
    this.codes.set(code, {
      slug,
      from: new Date("2026-09-17T09:00:00Z"),
      until: new Date("2026-09-18T09:00:00Z"),
    });
  }

  async findVenueByCode(code: string, at: Date) {
    const found = this.codes.get(code);
    if (!found) return null;
    return at >= found.from && at < found.until ? found.slug : null;
  }

  async countWrongGuesses(ipHash: string, windowStart: Date) {
    return this.guesses.get(this.key(ipHash, windowStart)) ?? 0;
  }

  async recordWrongGuess(ipHash: string, windowStart: Date) {
    const key = this.key(ipHash, windowStart);
    const count = (this.guesses.get(key) ?? 0) + 1;
    this.guesses.set(key, count);
    return count;
  }

  private key(ipHash: string, windowStart: Date) {
    return `${ipHash}:${windowStart.toISOString()}`;
  }
}

const NOW = new Date("2026-09-17T15:00:00Z");
const IP = "network-1";

let store: FakeStore;

const join = (code: string, ipHash: string | null = IP, now = NOW) =>
  joinWithCode({ code, ipHash, now }, store);

beforeEach(() => {
  store = new FakeStore();
  store.addLiveCode("12345678", "cafe-aaaa");
});

describe("joinWithCode", () => {
  it("opens the board a live code belongs to", async () => {
    expect(await join("12345678")).toEqual({ ok: true, slug: "cafe-aaaa" });
  });

  it("accepts a code typed with spaces or dashes", async () => {
    expect(await join("1234 5678")).toEqual({ ok: true, slug: "cafe-aaaa" });
    expect(await join("1234-5678")).toEqual({ ok: true, slug: "cafe-aaaa" });
  });

  it.each(["1234567", "123456789", "1234567a", ""])(
    "rejects %o without asking the database",
    async (code) => {
      const spy = vi.spyOn(store, "findVenueByCode");

      expect(await join(code)).toEqual({ ok: false, reason: "malformed" });
      expect(spy).not.toHaveBeenCalled();
    },
  );

  it("refuses a code that isn't live", async () => {
    expect(await join("87654321")).toEqual({ ok: false, reason: "unknown" });
  });

  it("refuses yesterday's code", async () => {
    const tomorrow = new Date("2026-09-18T15:00:00Z");

    expect(await join("12345678", IP, tomorrow)).toEqual({
      ok: false,
      reason: "unknown",
    });
  });

  it("counts a wrong guess against the network", async () => {
    await join("87654321");

    expect(await store.countWrongGuesses(IP, windowStartFor(NOW))).toBe(1);
  });

  it("never counts a correct code against the limit", async () => {
    await join("12345678");

    expect(await store.countWrongGuesses(IP, windowStartFor(NOW))).toBe(0);
  });

  it("cuts a network off after too many wrong guesses", async () => {
    store.guesses.set(
      `${IP}:${windowStartFor(NOW).toISOString()}`,
      GUESS_LIMIT,
    );

    expect(await join("87654321")).toEqual({
      ok: false,
      reason: "rate-limited",
    });
  });

  it("stops looking codes up once a network is cut off", async () => {
    store.guesses.set(
      `${IP}:${windowStartFor(NOW).toISOString()}`,
      GUESS_LIMIT,
    );
    const spy = vi.spyOn(store, "findVenueByCode");

    // Even the right code waits: the point is to stop the guessing, and the
    // customer who was given the code isn't the one guessing.
    expect(await join("12345678")).toEqual({
      ok: false,
      reason: "rate-limited",
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("lets the network try again in the next window", async () => {
    store.guesses.set(
      `${IP}:${windowStartFor(NOW).toISOString()}`,
      GUESS_LIMIT,
    );
    const later = new Date(NOW.getTime() + GUESS_WINDOW_MS);

    expect(await join("12345678", IP, later)).toEqual({
      ok: true,
      slug: "cafe-aaaa",
    });
  });

  it("still works when no proxy reported a network", async () => {
    const spy = vi.spyOn(store, "countWrongGuesses");

    expect(await join("12345678", null)).toEqual({
      ok: true,
      slug: "cafe-aaaa",
    });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("windowStartFor", () => {
  it("puts moments in the same window on the same start", () => {
    const start = windowStartFor(new Date("2026-09-17T15:00:00Z"));

    expect(windowStartFor(new Date("2026-09-17T15:09:59Z"))).toEqual(start);
    expect(windowStartFor(new Date("2026-09-17T15:10:00Z"))).not.toEqual(start);
  });
});
