import { expect, test } from "@playwright/test";

test("homepage loads and shows the DrawPin heading", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("heading", { name: "DrawPin" })).toBeVisible();
});
