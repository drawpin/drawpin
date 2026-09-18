// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { stubServerEnv } from "@/lib/testing/server-env";

const cookieStore = {
  get: vi.fn<(name: string) => { value: string } | undefined>(),
  set: vi.fn(),
};
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

const { ensureDeviceId } = await import("./device");
const { signDeviceId } = await import("./device-id");

const SECRET = "x".repeat(32);
const DEVICE = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const OTHER_DEVICE = "0b6f3f0e-2a8e-4b1a-9f55-4d9f0f6f2c11";

type DeviceRow = {
  id: string;
  fingerprint_hash: string | null;
  last_ip_hash: string | null;
  first_seen_at: number;
};

/** An in-memory `devices` table. */
class FakeDevices {
  rows: DeviceRow[] = [];
  inserted: Partial<DeviceRow>[] = [];
  /** The id the next insert gets. */
  nextId = OTHER_DEVICE;

  add(row: Partial<DeviceRow> & { id: string }) {
    this.rows.push({
      fingerprint_hash: null,
      last_ip_hash: null,
      first_seen_at: this.rows.length,
      ...row,
    });
  }

  willCreate(id: string) {
    this.nextId = id;
  }
}

/**
 * Just enough of the Supabase query builder for `devices`: filters by equality,
 * and is awaitable on its own the way an update is.
 */
function clientFor(db: FakeDevices): SupabaseClient {
  const query = (mode: "select" | "insert" | "update", payload?: object) => {
    const filters: Record<string, string> = {};
    const matching = () =>
      db.rows
        .filter((row) =>
          Object.entries(filters).every(
            ([column, value]) => row[column as keyof DeviceRow] === value,
          ),
        )
        .sort((a, b) => a.first_seen_at - b.first_seen_at);

    const builder = {
      eq(column: string, value: string) {
        filters[column] = value;
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      select: () => builder,
      async maybeSingle() {
        if (mode === "update") builder.applyUpdate();
        return { data: matching()[0] ?? null, error: null };
      },
      async single() {
        if (mode === "insert")
          return { data: builder.applyInsert(), error: null };
        return { data: matching()[0] ?? null, error: null };
      },
      applyInsert() {
        db.inserted.push(payload as Partial<DeviceRow>);
        db.add({ id: db.nextId, ...(payload as Partial<DeviceRow>) });
        return { id: db.nextId };
      },
      applyUpdate() {
        for (const row of matching()) Object.assign(row, payload);
      },
      // An update is awaited directly, without maybeSingle().
      then(resolve: (value: { data: null; error: null }) => void) {
        if (mode === "update") builder.applyUpdate();
        resolve({ data: null, error: null });
      },
    };
    return builder;
  };

  return {
    from: () => ({
      select: () => query("select"),
      insert: (payload: object) => query("insert", payload),
      update: (payload: object) => query("update", payload),
    }),
  } as unknown as SupabaseClient;
}

let devices: FakeDevices;

const signals = (fingerprintHash: string | null, ipHash: string | null) => ({
  fingerprintHash,
  ipHash,
});

beforeEach(() => {
  stubServerEnv();
  vi.stubEnv("DEVICE_COOKIE_SECRET", SECRET);
  cookieStore.get.mockReset().mockReturnValue(undefined);
  cookieStore.set.mockReset();
  devices = new FakeDevices();
});

/** Makes the visitor arrive with a valid cookie for this device. */
function withCookieFor(deviceId: string) {
  cookieStore.get.mockReturnValue({ value: signDeviceId(deviceId, SECRET) });
}

describe("ensureDeviceId", () => {
  it("keeps the device the cookie names", async () => {
    devices.add({ id: DEVICE });
    withCookieFor(DEVICE);

    expect(await ensureDeviceId(clientFor(devices), signals("fp", "ip"))).toBe(
      DEVICE,
    );
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("prefers the cookie over a fingerprint pointing elsewhere", async () => {
    devices.add({ id: DEVICE });
    devices.add({ id: OTHER_DEVICE, fingerprint_hash: "fp" });
    withCookieFor(DEVICE);

    expect(await ensureDeviceId(clientFor(devices), signals("fp", null))).toBe(
      DEVICE,
    );
  });

  it("reconnects a cookieless visitor by fingerprint, and re-issues the cookie", async () => {
    devices.add({ id: DEVICE, fingerprint_hash: "fp" });

    expect(await ensureDeviceId(clientFor(devices), signals("fp", "ip"))).toBe(
      DEVICE,
    );
    expect(cookieStore.set).toHaveBeenCalledOnce();
    expect(devices.inserted).toEqual([]);
  });

  it("creates a device when nothing matches", async () => {
    devices.willCreate(DEVICE);

    expect(await ensureDeviceId(clientFor(devices), signals("fp", "ip"))).toBe(
      DEVICE,
    );
    expect(devices.inserted).toEqual([
      { fingerprint_hash: "fp", last_ip_hash: "ip" },
    ]);
    expect(cookieStore.set).toHaveBeenCalledOnce();
  });

  it("creates a device when the cookie's row is gone", async () => {
    withCookieFor(DEVICE);
    devices.willCreate(OTHER_DEVICE);

    expect(await ensureDeviceId(clientFor(devices), signals(null, null))).toBe(
      OTHER_DEVICE,
    );
  });

  it("keeps the network current", async () => {
    devices.add({ id: DEVICE, last_ip_hash: "old-network" });
    withCookieFor(DEVICE);

    await ensureDeviceId(clientFor(devices), signals(null, "new-network"));

    expect(devices.rows[0].last_ip_hash).toBe("new-network");
  });

  it("fills in a missing fingerprint but never replaces one", async () => {
    devices.add({ id: DEVICE });
    withCookieFor(DEVICE);
    await ensureDeviceId(clientFor(devices), signals("fp", null));
    expect(devices.rows[0].fingerprint_hash).toBe("fp");

    // A second browser on the same device would otherwise take the row over.
    await ensureDeviceId(clientFor(devices), signals("other-fp", null));
    expect(devices.rows[0].fingerprint_hash).toBe("fp");
  });

  it("works with no signals at all", async () => {
    devices.willCreate(DEVICE);

    expect(await ensureDeviceId(clientFor(devices))).toBe(DEVICE);
    expect(devices.inserted).toEqual([
      { fingerprint_hash: null, last_ip_hash: null },
    ]);
  });
});
