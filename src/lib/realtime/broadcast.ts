import { serverEnv } from "@/lib/env";
import { boardTopic } from "./broadcast-topic";

export { boardTopic, TILE_REMOVED_EVENT } from "./broadcast-topic";

/**
 * Sends a message to everyone with this board open.
 *
 * Used for tile removal, which the database change feed can't deliver: a
 * removed tile stops satisfying the "live tiles" policy, so Realtime won't
 * send the update to visitors (docs/ERD.md, Realtime).
 *
 * @throws {Error} If Realtime rejected the message. Callers treat this as
 * non-fatal — the tile is already removed, and open boards catch up on their
 * next refresh.
 */
export async function broadcastToBoard(
  venueId: string,
  event: string,
  payload: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const env = serverEnv();

  const response = await fetchImpl(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`,
    {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ topic: boardTopic(venueId), event, payload }],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Broadcast failed: HTTP ${response.status}`);
  }
}
