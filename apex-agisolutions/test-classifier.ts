/**
 * Test script for AlgorithmicClassifier
 * Run: npx tsx test-classifier.ts
 */
const testNarrations = [
  { narration: "SWIGGY BANGALORE IN", amountPaise: 85000, expectedStatus: "BLOCKED" },
  { narration: "GOOGLE ADS INDIA PVT LTD", amountPaise: 4500000, expectedStatus: "RCM" },
  { narration: "NEFT-HDFC-M/S RAJ ENTERPRISES PVT LTD-INV-12345", amountPaise: 12500000, expectedStatus: "ELIGIBLE" },
  { narration: "POS/0012345/UBER INDIA/MUMBAI", amountPaise: 125000, expectedStatus: "ELIGIBLE" },
  { narration: "NEFT/INW/HDFC240122345678/OFFICE RENT JAN 2026", amountPaise: 5000000, expectedStatus: "ELIGIBLE" },
  { narration: "PAYPAL *AWS AMAZON WEB SERV", amountPaise: 3200000, expectedStatus: "RCM" },
  { narration: "ATM/WDL/240123456789012/SBIN0012345/MUMBAI", amountPaise: 1000000, expectedStatus: "UNKNOWN" },
  { narration: "STAR HEALTH INSURANCE ANNUAL PREMIUM", amountPaise: 1500000, expectedStatus: "BLOCKED" },
  { narration: "BHARATI AIRTEL/AIRTEL POSTPAID/BILL", amountPaise: 99900, expectedStatus: "ELIGIBLE" },
  { narration: "LIC OF INDIA ANNUAL PREMIUM", amountPaise: 5000000, expectedStatus: "BLOCKED" },
  { narration: "NEFT/SALARY DISBURSEMENT/JAN 2026/RAHUL SHARMA", amountPaise: 7500000, expectedStatus: "UNKNOWN" },
  { narration: "HDFC ERGO GENERAL INSURANCE PREMIUM", amountPaise: 1500000, expectedStatus: "ELIGIBLE" },
  { narration: "DOMINOS PIZZA MUMBAI IN", amountPaise: 50000, expectedStatus: "BLOCKED" },
  { narration: "ZOOM VIDEO COMMUNICATIONS", amountPaise: 180000, expectedStatus: "RCM" },
  { narration: "AMAZON RETAIL INDIA PURCHASE", amountPaise: 200000, expectedStatus: "UNKNOWN" },
  { narration: "GST PAYMENT/GSTR-3B/JAN 2026", amountPaise: 3000000, expectedStatus: "UNKNOWN" },
];

async function main() {
  const crypto = await import("crypto");
  const { AlgorithmicClassifier } = await import("./lib/engine/algorithmic-classifier");

  const classifier = new AlgorithmicClassifier();
  let passed = 0;
  let failed = 0;

  console.log("=".repeat(80));
  console.log("Algorithmic Classifier Test Suite");
  console.log("=".repeat(80));

  for (const test of testNarrations) {
    const start = performance.now();
    const result = classifier.classify(test.narration, test.amountPaise);
    const elapsed = (performance.now() - start).toFixed(2);

    const pass = result.itc_status === test.expectedStatus;
    const marker = pass ? "✅" : "❌";
    if (pass) passed++;
    else failed++;

    console.log(
      `${marker} [${result.itc_status.padEnd(12)}] ` +
      `conf=${result.itc_confidence.toFixed(2)} ` +
      `cat="${(result.category || "none").padEnd(25)}" ` +
      `vendor="${(result.mapped_vendor_name || "none").padEnd(20)}" ` +
      `${elapsed}ms | "${test.narration.substring(0, 60)}"`,
    );

    if (!pass) {
      console.log(`   Expected: ${test.expectedStatus}, Got: ${result.itc_status}`);
      console.log(`   Rules: [${result.matched_rules.join(", ")}]`);
      console.log(`   Reason: ${result.block_reason || "none"}`);
    }
  }

  console.log("-".repeat(80));
  console.log(`Passed: ${passed}/${testNarrations.length}, Failed: ${failed}`);
  console.log("=".repeat(80));
}

main().catch(console.error);
