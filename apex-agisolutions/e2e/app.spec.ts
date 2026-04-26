import { test, expect } from "@playwright/test";

test.describe("Apex AGI Solutions App", () => {
  test("loads marketing homepage with key sections", async ({ page }) => {
    // 1. Visit the home page
    await page.goto("/");

    // Check page title
    await expect(page).toHaveTitle(/Solutions|Elite Outsourcing/i);

    // Check main heading
    await expect(
      page.getByRole("heading", { name: /From India to the World/i }),
    ).toBeVisible();

    // Check services section
    await expect(
      page.getByRole("heading", { name: /Outsource with Confidence/i }),
    ).toBeVisible();

    // Check at least one service card
    await expect(
      page.getByRole("heading", { name: /Healthcare BPO/i }),
    ).toBeVisible();
  });

  test("dashboard redirects to home without auth token", async ({ page }) => {
    // Navigate to dashboard without token
    await page.goto("/dashboard");

    // Should redirect to home page
    await expect(page).toHaveURL("/");
    await expect(page).toHaveTitle(/Solutions|Elite Outsourcing/i);
  });

  test("footer has contact info and GSTSaathi waitlist form", async ({
    page,
  }) => {
    await page.goto("/");

    // Check contact info
    await expect(
      page.getByRole("heading", { name: /Ready to Scale/i }),
    ).toBeVisible();

    // Check GSTSaathi waitlist form exists
    await expect(
      page.getByRole("heading", { name: /Request GSTSaathi Access/i }),
    ).toBeVisible();
    await expect(page.locator('input[placeholder*="Acme Corp"]')).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Join Waitlist/i }),
    ).toBeVisible();
  });
});
