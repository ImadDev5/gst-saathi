import { inngest } from "@/inngest/client";
import { processStatement, processStatementAI, sendGstr3bReminders, cleanupStuckStatements } from "@/inngest/functions";
import { serve } from "inngest/next";

// Vercel Hobby allows up to 60s max duration, which gives slower NIM models
// enough room to finish a single AI batch without being cut off mid-request.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processStatement, processStatementAI, sendGstr3bReminders, cleanupStuckStatements],
  streaming: true,
});
