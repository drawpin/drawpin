import { expect, test } from "@playwright/test";

test("homepage loads and shows its headline", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.ok()).toBe(true);
  await expect(
    page.getByRole("heading", { level: 1, name: /Draw it. Pin it./ }),
  ).toBeVisible();
});
