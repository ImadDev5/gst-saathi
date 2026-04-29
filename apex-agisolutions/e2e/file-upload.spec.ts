import { test, expect } from "@playwright/test";
import path from "path";

test.describe("File Upload and Dashboard Metrics", () => {
  test("Uploads CSV and checks metrics", async ({ page }) => {
    test.setTimeout(10 * 60 * 1000);

    const api = page.context().request;
    const csvPath = path.resolve(__dirname, "../../business_bank_statement_sample.csv");

    const summaryBeforeResponse = await api.get("/api/v1/dashboard/summary", {
      headers: {
        Cookie: "trial_token=test-token-12345",
      },
    });
    expect(summaryBeforeResponse.ok()).toBeTruthy();
    const summaryBefore = await summaryBeforeResponse.json();
    const initialTransactions = summaryBefore.data?.totalTransactions ?? 0;

    await page.goto("/trial/test-token-12345", { waitUntil: "domcontentloaded" });
    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("heading", { name: "GSTSaathi Module A — ITC Pre-Processor" })).toBeVisible();

    const uploadResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/v1/statements/upload") &&
      response.request().method() === "POST",
    );

    await page.getByLabel("Statement file").setInputFiles(csvPath);
    await page.getByLabel("Bank name").selectOption("HDFC");
    await page.getByRole("button", { name: "Upload & Classify" }).click();

    const uploadResponse = await uploadResponsePromise;
    expect(uploadResponse.status()).toBe(202);
    const uploadJson = await uploadResponse.json();
    expect(uploadJson.statementId).toBeTruthy();

    await expect
      .poll(
        async () => {
          const response = await api.get(
            `/api/v1/statements/${uploadJson.statementId}/status`,
          );

          if (!response.ok()) {
            return `HTTP_${response.status()}`;
          }

          const json = await response.json();

          if (json.data?.status === "FAILED") {
            return `FAILED:${json.data?.error_message ?? "unknown"}`;
          }

          return json.data?.status ?? "UNKNOWN";
        },
        {
          intervals: [3000],
          timeout: 8 * 60 * 1000,
        },
      )
      .toBe("COMPLETED");

    const completedStatusResponse = await api.get(
      `/api/v1/statements/${uploadJson.statementId}/status`,
    );
    const completedStatus = await completedStatusResponse.json();
    expect(completedStatus.data?.transactionCount).toBeGreaterThan(0);

    await expect(page.getByText("Processing complete!")).toBeVisible({
      timeout: 30000,
    });

    await page.getByRole("button", { name: "Refresh" }).click();
    await expect(page.getByText("Classified Transactions")).toBeVisible({
      timeout: 30000,
    });

    const summaryAfterResponse = await api.get("/api/v1/dashboard/summary");
    expect(summaryAfterResponse.ok()).toBeTruthy();
    const summaryAfter = await summaryAfterResponse.json();

    expect(summaryAfter.data?.statementCount).toBeGreaterThan(0);
    expect(summaryAfter.data?.totalTransactions).toBeGreaterThan(initialTransactions);

    await expect(page.getByText("Insurance Premium").first()).toBeVisible();
  });
});
