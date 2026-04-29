import { test, expect } from "@playwright/test";

/**
 * Supabase-backed Role-Based Access Control Tests
 * ------------------------------------------------
 * These tests verify:
 *   1. The Contact tab is absent from user navigation.
 *   2. The user dashboard displays the "GST User" brand label.
 *   3. Users cannot access admin routes (redirected to user dashboard).
 *   4. Admins cannot access user-only routes (redirected to admin dashboard).
 *   5. Sign-in pages redirect already-authenticated users to the correct dashboard.
 *   6. Role-based access using Supabase session storage works correctly.
 */

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3001";

async function setUserCookie(context: import("@playwright/test").BrowserContext, token = "test-user-token-12345") {
  await context.addCookies([
    {
      name: "user_session",
      value: token,
      domain: new URL(BASE_URL).hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
}

async function setAdminCookie(context: import("@playwright/test").BrowserContext, token = "test-admin-token-67890") {
  await context.addCookies([
    {
      name: "admin_session",
      value: token,
      domain: new URL(BASE_URL).hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
}

async function setLegacyTrialCookie(context: import("@playwright/test").BrowserContext, token = "test-token-12345") {
  await context.addCookies([
    {
      name: "trial_token",
      value: token,
      domain: new URL(BASE_URL).hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
}

test.describe("Supabase-backed Role-Based Access Control", () => {
  test("user dashboard shows GST User label with user_session cookie", async ({ page, context }) => {
    await setUserCookie(context);
    await page.goto("/dashboard");

    // The sidebar brand should contain "GST" and "User" spans
    await expect(page.locator("aside").locator("text=GST").first()).toBeVisible();
    await expect(page.locator("aside").locator("text=User").first()).toBeVisible();
  });

  test("user dashboard shows GST User label with legacy trial_token cookie", async ({ page, context }) => {
    await setLegacyTrialCookie(context);
    await page.goto("/dashboard");

    // Should still work with legacy cookie
    await expect(page.locator("aside").locator("text=GST").first()).toBeVisible();
    await expect(page.locator("aside").locator("text=User").first()).toBeVisible();
  });

  test("user navbar shows Dashboard, Ledger and ITC Checker", async ({ page, context }) => {
    await setUserCookie(context);
    await page.goto("/dashboard");

    // Ensure the sidebar is rendered
    await expect(page.locator("aside")).toBeVisible();

    // Verify the three user nav items exist
    await expect(page.locator("aside nav").getByRole("link", { name: /Dashboard/i })).toBeVisible();
    await expect(page.locator("aside nav").getByRole("link", { name: /Ledger/i })).toBeVisible();
    await expect(page.locator("aside nav").getByRole("link", { name: /ITC Checker/i })).toBeVisible();
  });

  test("Contact tab is not present in user navigation", async ({ page, context }) => {
    await setUserCookie(context);
    await page.goto("/dashboard");

    // Ensure the sidebar is rendered
    await expect(page.locator("aside")).toBeVisible();

    // No link with text "Contact" or "Contacts" should appear in the nav
    const navLinks = page.locator("aside nav a");
    const count = await navLinks.count();
    for (let i = 0; i < count; i++) {
      const text = await navLinks.nth(i).textContent();
      expect(text?.toLowerCase()).not.toContain("contact");
    }
  });

  test("user is redirected away from admin routes with user_session", async ({ page, context }) => {
    await setUserCookie(context);
    await page.goto("/admin");

    // Should land on user dashboard with an error hint
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("aside").locator("text=GST").first()).toBeVisible();
    await expect(page.locator("aside").locator("text=User").first()).toBeVisible();
  });

  test("user is redirected away from admin routes with legacy trial_token", async ({ page, context }) => {
    await setLegacyTrialCookie(context);
    await page.goto("/admin");

    // Should land on user dashboard with an error hint
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("admin is redirected away from user-only routes", async ({ page, context }) => {
    await setAdminCookie(context);
    await page.goto("/dashboard");

    // Should land on admin dashboard with an error hint
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole("heading", { name: /Admin Panel/i })).toBeVisible();
  });

  test("admin is redirected away from retail routes", async ({ page, context }) => {
    await setAdminCookie(context);
    await page.goto("/retail");

    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole("heading", { name: /Admin Panel/i })).toBeVisible();
  });

  test("sign-in page redirects authenticated user to dashboard", async ({ page, context }) => {
    await setUserCookie(context);
    await page.goto("/signin");

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("sign-in page redirects authenticated admin to admin panel", async ({ page, context }) => {
    await setAdminCookie(context);
    await page.goto("/admin/signin");

    await expect(page).toHaveURL(/\/admin\/?$/);
  });

  test("unauthenticated visitor is redirected from user routes to home", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/$/);
  });

  test("unauthenticated visitor is redirected from admin routes to admin sign-in", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/signin/);
  });

  test("user can sign out from dashboard", async ({ page, context }) => {
    await setUserCookie(context);
    await page.goto("/dashboard");

    // Verify user is on dashboard
    await expect(page.locator("aside").locator("text=GST").first()).toBeVisible();

    // Click Sign Out button
    await page.getByRole("button", { name: "Sign Out" }).click();

    // Should redirect to home page
    await expect(page).toHaveURL(/\/$/);

    // Verify cookies are cleared by trying to access dashboard again
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/$/);
  });

  test("admin can sign out from admin panel", async ({ page, context }) => {
    await setAdminCookie(context);
    await page.goto("/admin");

    // Verify admin is on admin panel
    await expect(page.getByRole("heading", { name: /Admin Panel/i })).toBeVisible();

    // Click Logout button
    await page.getByRole("button", { name: "Logout" }).click();

    // Should redirect to admin sign-in page
    await expect(page).toHaveURL(/\/admin\/signin/);

    // Verify cookies are cleared by trying to access admin again
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/signin/);
  });

  test("invalid user_session token is rejected", async ({ page, context }) => {
    await setUserCookie(context, "invalid-token-that-does-not-exist");
    await page.goto("/dashboard");

    // Should redirect to home since the token is invalid in Supabase
    await expect(page).toHaveURL(/\/$/);
  });

  test("invalid admin_session token is rejected", async ({ page, context }) => {
    await setAdminCookie(context, "invalid-admin-token");
    await page.goto("/admin");

    // Should redirect to admin sign-in since the token is invalid in Supabase
    await expect(page).toHaveURL(/\/admin\/signin/);
  });
});
