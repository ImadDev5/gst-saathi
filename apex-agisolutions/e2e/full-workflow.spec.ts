import { test, expect } from "@playwright/test";

// This test suite runs against the local development server
// It performs a full End-to-End test representing the user journey
// from landing page exploration to GSTSaathi waitlist signup

test.describe("Full User Journey - Marketing Site", () => {
  test("Complete marketing site exploration and waitlist signup", async ({
    page,
  }) => {
    test.setTimeout(30000);

    // 1. Visit the home page
    await page.goto("/");
    await expect(page).toHaveTitle(/Solutions|Elite Outsourcing/i);

    // 2. Verify hero section
    await expect(
      page.getByRole("heading", { name: /From India to the World/i }),
    ).toBeVisible();
    await expect(page.getByText(/Elite outsourcing services/i)).toBeVisible();

    // 3. Check key stats in hero
    await expect(page.getByText(/60%.*Cost Savings/i)).toBeVisible();
    await expect(page.getByText(/24\/7.*Support/i)).toBeVisible();

    // 4. Verify services section
    await expect(
      page.getByRole("heading", { name: /Outsource with Confidence/i }),
    ).toBeVisible();

    // Check all service cards exist
    const services = [
      "Healthcare BPO",
      "Tech Staffing",
      "Sales & Lead Generation",
      "Finance & Accounting",
      "AI & Data Services",
      "Customer Support",
    ];
    for (const service of services) {
      await expect(
        page.getByRole("heading", { name: new RegExp(service, "i") }),
      ).toBeVisible();
    }

    // 5. Verify "Why India" section
    await expect(
      page.getByRole("heading", { name: /Why Outsource to India/i }),
    ).toBeVisible();
    await expect(page.getByText(/Cost Savings/i).first()).toBeVisible();
    await expect(page.getByText(/Top Talent Pool/i)).toBeVisible();

    // 6. Check compliance badges
    await expect(page.getByText("ISO 27001")).toBeVisible();
    await expect(page.getByText("HIPAA", { exact: true })).toBeVisible();
    await expect(page.getByText("GDPR", { exact: true })).toBeVisible();

    // 7. Verify testimonials section
    await expect(
      page.getByRole("heading", { name: /Trusted by Global Leaders/i }),
    ).toBeVisible();

    // 8. Scroll to footer and check GSTSaathi waitlist form
    await page
      .getByRole("heading", { name: /Request GSTSaathi Access/i })
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByRole("heading", { name: /Request GSTSaathi Access/i }),
    ).toBeVisible();

    // 9. Fill out waitlist form
    await page.getByRole("textbox", { name: /Company/i }).fill("Test Corp");
    await page
      .getByRole("textbox", { name: /Contact Name/i })
      .fill("John Tester");
    await page.getByRole("textbox", { name: /Email/i }).fill("john@test.com");
    await page.getByRole("textbox", { name: /Phone/i }).fill("9876543210");
    await page.getByRole("textbox", { name: /GSTIN/i }).fill("22AAAAA0000A1Z5");

    // 10. Submit form (button should be enabled after filling required fields)
    const submitBtn = page.getByRole("button", { name: /Join Waitlist/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Wait briefly for any submission feedback
    await page.waitForTimeout(1000);
  });

  test("Dashboard is protected and redirects without token", async ({
    page,
  }) => {
    // Try to access dashboard directly
    await page.goto("/dashboard");

    // Should redirect to home page
    await expect(page).toHaveURL("/");
    await expect(page).toHaveTitle(/Solutions|Elite Outsourcing/i);
  });

  test("Navigation links work correctly", async ({ page }) => {
    await page.goto("/");

    // Check navigation menu items
    const navLinks = ["SERVICES", "WHY INDIA", "INDUSTRIES"];
    for (const link of navLinks) {
      await expect(
        page.getByRole("link", { name: new RegExp(link, "i") }),
      ).toBeVisible();
    }

    // Click on a nav link and verify smooth scroll behavior
    await page.getByRole("link", { name: /SERVICES/i }).click();
    await page.waitForTimeout(500);
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
