import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const TEST_DATA_DIR = path.resolve(__dirname, "../test-data");

test.describe("Bank-Specific CSV Parsing", () => {
  const banks = [
    { name: "HDFC", file: "hdfc-statement.csv" },
    { name: "ICICI", file: "icici-statement.csv" },
    { name: "SBI", file: "sbi-statement.csv" },
    { name: "KOTAK", file: "kotak-statement.csv" },
    { name: "AXIS", file: "axis-statement.csv" },
  ];

  for (const bank of banks) {
    test(`Uploads ${bank.name} CSV and verifies parsing`, async ({ page }) => {
      test.setTimeout(10 * 60 * 1000);

      const api = page.context().request;
      const csvPath = path.join(TEST_DATA_DIR, bank.file);

      expect(fs.existsSync(csvPath)).toBeTruthy();

      await page.goto("/trial/test-token-12345", { waitUntil: "domcontentloaded" });
      await page.waitForURL("**/dashboard");
      await expect(page.getByRole("heading", { name: "GSTSaathi Module A — ITC Pre-Processor" })).toBeVisible();

      const uploadResponsePromise = page.waitForResponse((response) =>
        response.url().includes("/api/v1/statements/upload") &&
        response.request().method() === "POST",
      );

      await page.getByLabel("Statement file").setInputFiles(csvPath);
      await page.getByLabel("Bank name").selectOption(bank.name);
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
            if (!response.ok()) return `HTTP_${response.status()}`;
            const json = await response.json();
            if (json.data?.status === "FAILED") {
              return `FAILED:${json.data?.error_message ?? "unknown"}`;
            }
            return json.data?.status ?? "UNKNOWN";
          },
          { intervals: [3000], timeout: 8 * 60 * 1000 },
        )
        .toBe("COMPLETED");

      const completedStatusResponse = await api.get(
        `/api/v1/statements/${uploadJson.statementId}/status`,
      );
      const completedStatus = await completedStatusResponse.json();
      expect(completedStatus.data?.transactionCount).toBeGreaterThanOrEqual(10);

      await expect(page.getByText("Processing complete!")).toBeVisible({ timeout: 30000 });
    });
  }
});
