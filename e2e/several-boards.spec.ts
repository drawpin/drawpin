import { loadEnvConfig } from "@next/env";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Signs in through a link made with the service role, so this runs only
// against a Supabase the test may write to: the local stack, from
// .env.local. Without one it's skipped.
loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const isLocal = /^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url);

test.skip(
  !isLocal || !serviceRoleKey,
  "Needs the local Supabase stack in .env.local",
);

const admin = () =>
  createClient(url, serviceRoleKey, { auth: { persistSession: false } });

test("one account runs two boards, switches, and closes one (ADR-016)", async ({
  page,
}) => {
  const email = `e2e-boards-${Date.now()}@example.com`;
  const created = await admin().auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  const userId = created.data.user.id;

  try {
    const link = await admin().auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (link.error) throw link.error;
    await page.goto(
      `/auth/confirm?token_hash=${link.data.properties.hashed_token}&type=magiclink`,
    );

    // No boards yet: /admin sends the account to set one up.
    await expect(page).toHaveURL(/\/setup$/);
    await createBoard(page, "Office Doodles");
    await expect(page).toHaveURL(/\/admin\/office-doodles-[a-z0-9]+$/);
    const firstAdmin = page.url();
    // With one board there's nothing to switch to.
    await expect(
      page.getByRole("navigation", {
        name: "Your boards",
        includeHidden: true,
      }),
    ).toHaveCount(0);

    await page.goto("/setup");
    await expect(
      page.getByRole("heading", { name: "Start a new board" }),
    ).toBeVisible();
    await createBoard(page, "Friends Sketches");
    await expect(page).toHaveURL(/\/admin\/friends-sketches-[a-z0-9]+$/);

    // Two boards: /admin lists them.
    await page.goto("/admin");
    await expect(page.getByText("You run 2 of 5 boards.")).toBeVisible();
    await page.getByRole("link", { name: "Office Doodles" }).click();
    await expect(page).toHaveURL(firstAdmin);

    // The switcher goes to the other board.
    await page.locator("summary", { hasText: "Switch board" }).click();
    await page
      .getByRole("navigation", { name: "Your boards" })
      .getByRole("link", { name: "Friends Sketches" })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Friends Sketches" }),
    ).toBeVisible();

    // Close it; the account and its other board stay.
    await page.getByRole("heading", { name: "Close board" }).click();
    await page.getByRole("button", { name: "Close board…" }).click();
    await expect(page.getByText("This board only.")).toBeVisible();
    await page.getByLabel(/to confirm/).fill("Friends Sketches");
    await page.getByRole("button", { name: "Close board for good" }).click();

    // /admin with one board left goes straight to it.
    await expect(page).toHaveURL(firstAdmin);
    await expect(
      page.getByRole("heading", { level: 1, name: "Office Doodles" }),
    ).toBeVisible();
  } finally {
    // Deleting the sign-in cascades to the owner row and its boards.
    await admin().auth.admin.deleteUser(userId);
  }
});

async function createBoard(
  page: import("@playwright/test").Page,
  name: string,
) {
  await page.getByLabel("Board name").fill(name);
  await page.getByRole("button", { name: "Create my board" }).click();
}
