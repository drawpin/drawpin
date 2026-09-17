// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { boardTopic, broadcastToBoard } from "./broadcast";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
  vi.stubEnv("SITE_URL", "http://localhost:3000");
  vi.stubEnv("DEVICE_COOKIE_SECRET", "x".repeat(32));
  vi.stubEnv("OPENAI_API_KEY", "sk-test");
});

describe("boardTopic", () => {
  it("is per venue, so one board's messages don't reach another", () => {
    expect(boardTopic("venue-1")).toBe("board:venue-1");
    expect(boardTopic("venue-2")).not.toBe(boardTopic("venue-1"));
  });
});

describe("broadcastToBoard", () => {
  it("posts the message to the venue's topic with the service key", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("", { status: 202 }));

    await broadcastToBoard(
      "venue-1",
      "tile-removed",
      { tileId: "t1" },
      fetchMock,
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:54321/realtime/v1/api/broadcast");
    expect(init?.headers).toMatchObject({ apikey: "service-key" });
    expect(JSON.parse(String(init?.body))).toEqual({
      messages: [
        {
          topic: "board:venue-1",
          event: "tile-removed",
          payload: { tileId: "t1" },
        },
      ],
    });
  });

  it("throws when Realtime rejects it, so the caller can log and carry on", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("nope", { status: 500 }));

    await expect(
      broadcastToBoard("venue-1", "tile-removed", {}, fetchMock),
    ).rejects.toThrow(/HTTP 500/);
  });
});
