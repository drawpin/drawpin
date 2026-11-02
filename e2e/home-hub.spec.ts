import { loadEnvConfig } from "@next/env";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Seeds an account and a board with the service role, so this runs only
// against a Supabase the test may write to: the local stack, from
// .env.local. Without one it's skipped.
loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const isLocal = /^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url);

const admin = () =>
  createClient(url, serviceRoleKey, { auth: { persistSession: false } });

test("signed out, / and /about are the marketing home", async ({ page }) => {
  for (const path of ["/", "/about"]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { level: 1, name: /Draw it. Pin it./ }),
    ).toBeVisible();
  }
});

test("a signed-in account lands on the hub, with what's waiting (ADR-015)", async ({
  page,
}) => {
  test.skip(
    !isLocal || !serviceRoleKey,
    "Needs the local Supabase stack in .env.local",
  );

  const stamp = Date.now();
  const email = `e2e-hub-${stamp}@example.com`;
  const slug = `hub-e2e-${stamp}`;
  const created = await admin().auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  const userId = created.data.user.id;

  try {
    // A name, and one board it runs and has opened, where it hasn't posted
    // today: "Draw today" is waiting.
    for (const result of [
      await admin().from("profiles").upsert({ id: userId, username: "Hubby" }),
      await admin().from("owners").upsert({ id: userId, email }),
    ]) {
      if (result.error) throw result.error;
    }
    const venue = await admin()
      .from("venues")
      .insert({
        slug,
        name: "Hub Test Board",
        owner_id: userId,
        timezone: "UTC",
      })
      .select("id")
      .single();
    if (venue.error) throw venue.error;
    const visit = await admin().from("board_visits").insert({
      user_id: userId,
      venue_id: venue.data.id,
      last_visited_at: new Date().toISOString(),
    });
    if (visit.error) throw visit.error;

    const link = await admin().auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (link.error) throw link.error;
    await page.goto(
      `/auth/confirm?token_hash=${link.data.properties.hashed_token}&type=magiclink`,
    );

    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Hi, Hubby." }),
    ).toBeVisible();
    await expect(
      page.getByText("One thing is waiting on your boards."),
    ).toBeVisible();

    const today = page.getByRole("region", { name: "Waiting for you" });
    await expect(
      today.getByRole("heading", { name: "Draw today" }),
    ).toBeVisible();
    await expect(today.getByRole("link", { name: "Draw" })).toHaveAttribute(
      "href",
      `/b/${slug}/draw`,
    );

    const boards = page.locator("#boards");
    const card = boards.getByRole("link", { name: /Hub Test Board/ });
    await expect(card).toHaveAttribute("href", `/b/${slug}`);
    await expect(card.getByText("Owner")).toBeVisible();

    // The marketing home is still at /about.
    await page.goto("/about");
    await expect(
      page.getByRole("heading", { level: 1, name: /Draw it. Pin it./ }),
    ).toBeVisible();
  } finally {
    await admin().from("venues").delete().eq("slug", slug);
    await admin().auth.admin.deleteUser(userId);
  }
});
