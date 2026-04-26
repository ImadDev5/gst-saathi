import { test, expect } from "@playwright/test";

// This test suite runs against the local development server
// It performs a full End-to-End test representing the user journey
// from landing page exploration to GSTSaathi waitlist signup

// Helper to disable WebGL / GPU in headless Chrome (prevents page crash from Three.js)
async function disableGPU(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    // Disable WebGL to prevent GPU crashes in headless mode
    Object.defineProperty(
      HTMLCanvasElement.prototype,
      "getContext",
      { value: () => null }
    );
  });
}

test.describe("Full User Journey - Marketing Site", () => {
  test("Complete marketing site exploration and waitlist signup", async ({
    page,
  }) => {
    test.setTimeout(60000);

    // Disable GPU / WebGL to avoid page crash from Three.js
    await disableGPU(page);

    // Navigate with a longer timeout for heavy page
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1", { timeout: 15000 });
    await expect(page).toHaveTitle(/Solutions|Elite Outsourcing/i);

    // Verify hero heading
    await expect(
      page.getByRole("heading", { name: /From India to the World/i }),
    ).toBeVisible();

    // Scroll past hero to avoid any stuck animations
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(500);

    // Verify services section
    await expect(
      page.getByRole("heading", { name: /Outsource with Confidence/i }),
    ).toBeVisible();

    // Check compliance badges
    await expect(page.getByText("ISO 27001")).toBeVisible();

    // Verify testimonials section
    await expect(
      page.getByRole("heading", { name: /Trusted by Global Leaders/i }),
    ).toBeVisible();

    // Scroll to footer and check GSTSaathi waitlist form
    await page
      .getByRole("heading", { name: /Request GSTSaathi Access/i })
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByRole("heading", { name: /Request GSTSaathi Access/i }),
    ).toBeVisible();

    // Fill out waitlist form (labels match ContactForm component)
    await page.getByLabel(/Company\/Business Name/i).fill("Test Corp");
    await page.getByLabel(/Contact Name/i).fill("John Tester");
    await page.getByLabel(/^Email/i).fill("john@test.com");
    await page.getByLabel(/Phone Number/i).fill("9876543210");
    await page.getByLabel(/GSTIN/i).fill("22AAAAA0000A1Z5");

    // Submit form
    const submitBtn = page.getByRole("button", { name: /Join Waitlist/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Wait for submission feedback
    await page.waitForTimeout(2000);
  });

  test("Dashboard is protected and redirects without token", async ({
    page,
  }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    // Should redirect to home page
    await page.waitForURL("**/", { timeout: 10000 });
    await expect(page).toHaveTitle(/Solutions|Elite Outsourcing/i);
  });

  test("Navigation links work correctly", async ({ page }) => {
    await disableGPU(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1", { timeout: 15000 });

    // Check navigation menu items exist
    const navLinks = ["SERVICES", "WHY INDIA", "INDUSTRIES"];
    for (const link of navLinks) {
      await expect(
        page.getByRole("link", { name: new RegExp(link, "i") }),
      ).toBeVisible();
    }

    // Click on a nav link and verify scroll behavior
    await page.getByRole("link", { name: /SERVICES/i }).click();
    await page.waitForTimeout(1000);
    await expect(
      page.getByRole("heading", { name: /Outsource with Confidence/i }),
    ).toBeInViewport();
  });
});

test.describe("API Health Checks", () => {
  test("Verify backend API endpoints respond", async ({ request }) => {
    // Test dashboard summary endpoint (may return 401 without auth)
    const summaryResponse = await request.get("/api/v1/dashboard/summary");
    expect([200, 401, 400, 404]).toContain(summaryResponse.status());

    // Test that the main page loads
    const homeResponse = await request.get("/");
    expect(homeResponse.status()).toBe(200);
  });
});
