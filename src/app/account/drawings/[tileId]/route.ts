import { z } from "zod";
import { getCustomer } from "@/lib/customer";
import { prepareDownload } from "@/lib/my-drawings";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseDownloadDeps } from "@/lib/supabase-my-drawings";

const tileIdSchema = z.guid();

/**
 * Saves one of the signed-in account's own drawings as a PNG (issue #57).
 * Anything else, including someone else's drawing, is a plain 404, so the
 * route says nothing about tiles that aren't yours.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/account/drawings/[tileId]">,
) {
  const { tileId } = await params;
  const admin = createAdminClient();
  const customer = await getCustomer(admin);
  const parsed = tileIdSchema.safeParse(tileId);
  if (!customer || !parsed.success) {
    return new Response("Not found", { status: 404 });
  }

  const download = await prepareDownload(
    parsed.data,
    customer.id,
    supabaseDownloadDeps(admin),
  );
  if (!download) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(download.file), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${download.name}"`,
      // Someone's own file, behind their sign-in: never cached in between.
      "Cache-Control": "private, no-store",
    },
  });
}
