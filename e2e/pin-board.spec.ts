import { loadEnvConfig } from "@next/env";
import { expect, type Page, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * A signed-in account pins a board from its header, and the sidebar shows
 * it (ADR-015). Signs in through a link made with the service role, so it
 * runs only against the local Supabase from .env.local, with
 * `E2E_BOARD_SLUG` set to one of its boards. Skipped otherwise.
 */
loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const isLocal = /^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url);
const slug = process.env.E2E_BOARD_SLUG;

test.skip(
  !isLocal || !serviceRoleKey || !slug,
  "Needs the local Supabase in .env.local and E2E_BOARD_SLUG",
);

const admin = () =>
  createClient(url, serviceRoleKey, { auth: { persistSession: false } });

/** Opens the drawer, again if a tap landed before the page was hydrated. */
async function openMenu(page: Page) {
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(async () => {
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(menu).toBeVisible({ timeout: 1000 });
  }).toPass();
  return menu;
}

test("pin and unpin a board from its header", async ({ page }) => {
  const email = `e2e-pin-${Date.now()}@example.com`;
  const created = await admin().auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  const userId = created.data.user.id;

  try {
    const profile = await admin()
      .from("profiles")
      .insert({ id: userId, username: "Pin Tester" });
    if (profile.error) throw profile.error;
    const link = await admin().auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (link.error) throw link.error;
    await page.goto(
      `/auth/confirm?token_hash=${link.data.properties.hashed_token}&type=magiclink`,
    );
    await page.waitForURL((target) => !target.pathname.startsWith("/auth"));

    await page.goto(`/b/${slug}`);
    const boardName = await page.getByRole("heading", { level: 1 }).innerText();
    const pin = page.getByRole("button", { name: "Pin this board" });
    await expect(pin).toHaveAttribute("aria-pressed", "false");

    // Once the page is hydrated and the visit is recorded.
    await page.waitForLoadState("networkidle");
    await pin.click();
    await expect(
      page.getByRole("button", { name: "Unpin this board" }),
    ).toHaveAttribute("aria-pressed", "true");

    // The sidebar's row shows the pin too, without a reload.
    const menu = await openMenu(page);
    const row = menu.getByRole("link", { name: new RegExp(boardName) });
    await expect(row.getByLabel("Pinned")).toBeVisible();
    await page.keyboard.press("Escape");

    // It's on the account, so it's still pinned after a reload.
    await page.reload();
    await page.getByRole("button", { name: "Unpin this board" }).click();
    await expect(
      page.getByRole("button", { name: "Pin this board" }),
    ).toHaveAttribute("aria-pressed", "false");
  } finally {
    await admin().auth.admin.deleteUser(userId);
  }
});
