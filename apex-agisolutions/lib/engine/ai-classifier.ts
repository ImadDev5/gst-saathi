import OpenAI from "openai";
import { readIntEnv, readFloatEnv } from "@/lib/env";

function buildFallback(
  transactions: Array<{ id: string; description: string; amount: number }>,
  reason: string,
) {
  return transactions.map((t) => ({
    id: t.id,
    mapped_vendor_name: null,
    itc_status: "UNKNOWN" as const,
    block_reason: reason,
    itc_confidence: 0,
  }));
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
        timeout: readIntEnv("NVIDIA_NIM_TIMEOUT_MS", 25000),
        maxRetries: 0,
      });
      this.model =
        process.env.NVIDIA_NIM_MODEL || "z-ai/glm4.7";
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
      return buildFallback(transactions, "AI disabled or API key missing");
    }

    const payload = transactions.map((t) => ({
      id: t.id,
      narration: t.description,
      amount: t.amount,
    }));

    const isGlmModel = this.model.includes("glm");
    const isGemmaModel = this.model.includes("gemma");

    const startedAt = Date.now();
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
        temperature: readFloatEnv("NVIDIA_NIM_TEMPERATURE", 0),
        top_p: readFloatEnv("NVIDIA_NIM_TOP_P", 1),
        max_tokens: readIntEnv("NVIDIA_NIM_MAX_TOKENS", 500),
      };

      if (isGlmModel) {
        requestBody.chat_template_kwargs = {
          enable_thinking: false,
        };
      }

      // Gemma models don't support system role through OpenAI compat layer
      if (isGemmaModel) {
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

      const elapsed = Date.now() - startedAt;
      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.warn(`[ai] batch=${transactions.length} model=${this.model} elapsed=${elapsed}ms result=empty`);
        return buildFallback(transactions, "Empty AI response");
      }

      let jsonContent = content.trim();
      jsonContent = jsonContent.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      jsonContent = jsonContent.replace(/^(?:<[^>\n]+>\s*)+/, "").trim();

      // Strip markdown code blocks if present
      if (jsonContent.startsWith("```json")) {
        jsonContent = jsonContent.replace(/```json\s*/, "").replace(/\s*```\s*$/, "");
      } else if (jsonContent.startsWith("```")) {
        jsonContent = jsonContent.replace(/```\s*/, "").replace(/\s*```\s*$/, "");
      }

      const firstBrace = jsonContent.indexOf("{");
      const lastBrace = jsonContent.lastIndexOf("}");
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        jsonContent = jsonContent.slice(firstBrace, lastBrace + 1);
      }

      const parsed = JSON.parse(jsonContent);
      const results = parsed.transactions || [];
      console.info(`[ai] batch=${transactions.length} model=${this.model} elapsed=${elapsed}ms result=${results.length}tx`);
      return results;
    } catch (err) {
      const elapsed = Date.now() - startedAt;
      console.error(`[ai] batch=${transactions.length} model=${this.model} elapsed=${elapsed}ms result=error`, err);
      return buildFallback(transactions, "AI timeout or error");
    }
  }
}
