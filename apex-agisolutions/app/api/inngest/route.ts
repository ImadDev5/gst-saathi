import { inngest } from "@/inngest/client";
import { processStatement, sendGstr3bReminders } from "@/inngest/functions";
import { serve } from "inngest/next";

// Vercel Hobby plan max duration is 10s.
// Inngest checkpointing + streaming allows steps to resume across timeouts.
export const maxDuration = 10;
export const dynamic = "force-dynamic";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processStatement, sendGstr3bReminders],
  streaming: true,
});
