import { expect, test } from "@playwright/test";

test("sign-in page offers Google and an emailed code, and keeps next", async ({
  page,
}) => {
  await page.goto("/login?next=/b/some-board/draw");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Keep your boards in one place",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.locator("input[name=next]").first()).toHaveValue(
    "/b/some-board/draw",
  );
});

test("sign-in page refuses a next that leaves the site", async ({ page }) => {
  await page.goto("/login?next=//evil.example");
  await expect(page.locator("input[name=next]").first()).toHaveValue("/");
});

test("sign-in page returns to the code step after a reload", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "drawpin:email-code",
      JSON.stringify({ email: "a@example.com", sentAt: Date.now() }),
    );
  });
  await page.goto("/login");

  await expect(
    page.getByRole("heading", { name: "Type the code" }),
  ).toBeVisible();
  await expect(page.getByText("a@example.com")).toBeVisible();
  await page.getByRole("button", { name: "Use a different email" }).click();
  await expect(page.getByLabel("Email")).toBeVisible();
});
