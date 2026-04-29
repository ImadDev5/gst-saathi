import OpenAI from "openai";

function readIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export class AIClassifier {
  private openai: OpenAI;
  public model: string;

  constructor() {
    this.openai = new OpenAI({
      baseURL:
        process.env.NVIDIA_NIM_BASE_URL ||
        "https://integrate.api.nvidia.com/v1",
      apiKey: process.env.NVIDIA_NIM_API_KEY,
      timeout: readIntEnv("NVIDIA_NIM_TIMEOUT_MS", 90000), // 90 seconds keeps slow NIM tolerable without hanging the upload for ages
      maxRetries: 0, // Avoid doubling already-slow NIM waits on timeout
    });
    this.model = process.env.NVIDIA_NIM_MODEL || "Qwen/Qwen2.5-72B-Instruct";
  }

  public async classifyBatch(
    transactions: Array<{ id: string; description: string; amount: number }>,
  ) {
    if (transactions.length === 0) return [];

    // Skip if API key is not set to avoid breaking local dev
    if (
      !process.env.NVIDIA_NIM_API_KEY ||
      process.env.DISABLE_AI_CLASSIFIER === "1" ||
      process.env.DISABLE_AI_CLASSIFIER === "true"
    ) {
      console.warn(
        "AI classification is disabled or NVIDIA_NIM_API_KEY is not set. Skipping AI classification.",
      );
      return transactions.map((t) => ({
        id: t.id,
        mapped_vendor_name: "Auto-AI Skipped",
        itc_status: "UNKNOWN",
        block_reason: "API key missing",
        itc_confidence: 0,
      }));
    }

    const payload = transactions.map((t) => ({
      id: t.id,
      narration: t.description,
      amount: t.amount,
    }));

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: `You are an expert Indian Chartered Accountant assisting with GST Input Tax Credit (ITC). Output ONLY JSON in the following format:
{
  "transactions": [
    {
      "id": "string",
      "mapped_vendor_name": "string",
      "itc_status": "ELIGIBLE|BLOCKED|CONDITIONAL|RCM|UNKNOWN",
      "block_reason": "string|null",
      "itc_confidence": "number(0.0-1.0)"
    }
  ]
}

Rules:
1. Examine the bank narration and amount.
2. Determine a clean 'mapped_vendor_name'.
3. Determine if the transaction qualifies for ITC (ELIGIBLE), is BLOCKED under Section 17(5) (e.g. food, passenger vehicles), applies for Reverse Charge (RCM), or CONDITIONAL.
4. Output a confidence score between 0.0 and 1.0`,
          },
          {
            role: "user",
            content: JSON.stringify(payload),
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) return [];
      const parsed = JSON.parse(content);
      return parsed.transactions || [];
    } catch (err) {
      console.error("AI classification request failed", err);
      return [];
    }
  }
}
