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
  private provider: "nvidia" | "none";

  constructor() {
    if (process.env.NVIDIA_NIM_API_KEY) {
      this.provider = "nvidia";
      this.openai = new OpenAI({
        baseURL:
          process.env.NVIDIA_NIM_BASE_URL ||
          "https://integrate.api.nvidia.com/v1",
        apiKey: process.env.NVIDIA_NIM_API_KEY,
        timeout: readIntEnv("NVIDIA_NIM_TIMEOUT_MS", 6500),
        maxRetries: 0,
      });
      this.model =
        process.env.NVIDIA_NIM_MODEL || "meta/llama-3.1-8b-instruct";
    } else {
      this.provider = "none";
      this.openai = new OpenAI({ apiKey: "dummy" });
      this.model = "none";
    }
  }

  public async classifyBatch(
    transactions: Array<{ id: string; description: string; amount: number }>,
  ) {
    if (transactions.length === 0) return [];

    // Skip if no API key is set
    if (
      this.provider === "none" ||
      process.env.DISABLE_AI_CLASSIFIER === "1" ||
      process.env.DISABLE_AI_CLASSIFIER === "true"
    ) {
      console.warn(
        "AI classification is disabled or API key is not set. Skipping AI classification.",
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
      const systemPrompt = `You are a GST expert. For each transaction, classify ITC status.

STRICT RULES:
- Output ONLY valid JSON. No markdown, no explanations, no code blocks.
- Format: {"transactions":[{"id":"...","mapped_vendor_name":"...","itc_status":"ELIGIBLE|BLOCKED|RCM|UNKNOWN","block_reason":"...","itc_confidence":0.8}]}
- ELIGIBLE: office expenses, professional services, business supplies, software, rent
- BLOCKED: food, travel, personal, passenger vehicles, entertainment (Section 17(5))
- RCM: imports, OIDAR services, legal, GTA
- UNKNOWN: unclear business purpose
- Confidence: 0.0-1.0 based on clarity`;

      const requestBody: any = {
        model: this.model,
        messages: [],
        stream: false,
        temperature: 0,
        max_tokens: readIntEnv(
          "NVIDIA_NIM_MAX_TOKENS",
          Math.min(900, 220 + transactions.length * 110),
        ),
      };

      // Gemma models don't support system role through OpenAI compat layer
      if (this.model.includes("gemma")) {
        requestBody.messages = [
          {
            role: "user",
            content: systemPrompt + "\n\n" + JSON.stringify(payload),
          },
        ];
      } else {
        requestBody.messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(payload) },
        ];
      }

      const response = await this.openai.chat.completions.create(requestBody);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.warn("AI returned empty content");
        return [];
      }

      // Strip markdown code blocks if present
      let jsonContent = content.trim();
      if (jsonContent.startsWith("```json")) {
        jsonContent = jsonContent.replace(/```json\s*/, "").replace(/\s*```\s*$/, "");
      } else if (jsonContent.startsWith("```")) {
        jsonContent = jsonContent.replace(/```\s*/, "").replace(/\s*```\s*$/, "");
      }

      // Try to extract JSON object from the response
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonContent = jsonMatch[0];
      }

      const parsed = JSON.parse(jsonContent);
      return parsed.transactions || [];
    } catch (err) {
      console.error("AI classification request failed:", err);
      return [];
    }
  }
}
