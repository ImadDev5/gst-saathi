import Sidebar from "@/components/Sidebar";
export const dynamic = "force-dynamic";

export default function RetailLayout({ children }: { children: React.ReactNode }) {
  return <Sidebar>{children}</Sidebar>;
}
