import { Inngest } from "inngest";

// Ensure Inngest is ready to connect, providing a readable name for the Vercel dashboard
export const inngest = new Inngest({ id: "gstsaathi-inngest" });