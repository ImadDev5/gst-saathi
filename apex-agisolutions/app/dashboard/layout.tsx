import Sidebar from "@/components/Sidebar";
import { getSessionInfo } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionInfo();
  return (
    <Sidebar isAdmin={session?.isAdmin} sessionToken={session?.trialToken || session?.adminToken || null}>
      {children}
    </Sidebar>
  );
}