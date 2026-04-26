import { inngest } from "@/inngest/client";
import { processStatement, sendGstr3bReminders } from "@/inngest/functions";
import { serve } from "inngest/next";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processStatement, sendGstr3bReminders],
});
