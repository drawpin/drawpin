import { expect, type Page, test } from "@playwright/test";

/**
 * A board opened signed out is remembered on the device and shows in the
 * sidebar's drawer; removing it can be undone (ADR-015).
 *
 * Needs a board in the database the app points at: run against the local
 * Supabase with `E2E_BOARD_SLUG` set to one of its boards' slugs, e.g. one
 * made by `npm run preview:seed`. Skipped without it.
 */
const slug = process.env.E2E_BOARD_SLUG;

/** Opens the drawer, again if a tap landed before the page was hydrated. */
async function openMenu(page: Page) {
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(async () => {
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(menu).toBeVisible({ timeout: 1000 });
  }).toPass();
  return menu;
}

test.skip(!slug, "Set E2E_BOARD_SLUG to a board in the local database");

test("a board opened signed out is in the drawer, and Remove can be undone", async ({
  page,
}) => {
  await page.goto(`/b/${slug}`);
  const boardName = await page.getByRole("heading", { level: 1 }).innerText();

  const menu = await openMenu(page);
  await expect(menu.getByText("On this device")).toBeVisible();

  const row = menu.getByRole("link", { name: new RegExp(boardName) });
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute("aria-current", "page");

  await menu.getByRole("button", { name: `More for ${boardName}` }).click();
  await page.getByRole("menuitem", { name: "Remove from my boards" }).click();
  await expect(row).toBeHidden();
  await expect(page.getByText(`Removed ${boardName}.`)).toBeVisible();

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(row).toBeVisible();

  // It's on the device, so it's still there after a reload.
  await page.reload();
  await expect(
    (await openMenu(page)).getByRole("link", { name: new RegExp(boardName) }),
  ).toBeVisible();
});

test("Sign in in the drawer closes it and opens the sign-in sheet", async ({
  page,
}) => {
  await page.goto(`/b/${slug}?from=qr`);
  const boardName = await page.getByRole("heading", { level: 1 }).innerText();

  const menu = await openMenu(page);
  await menu.getByRole("button", { name: "Sign in" }).click();

  // One dialog at a time: the drawer goes as the sheet comes.
  await expect(menu).toBeHidden();
  const sheet = page.getByRole("dialog", {
    name: "Keep your boards in one place",
  });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText(`come back to ${boardName}`)).toBeVisible();
  await expect(sheet.locator("input[name=next]").first()).toHaveValue(
    `/b/${slug}?from=qr`,
  );

  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
});
