import Sidebar from "@/components/Sidebar";
export const dynamic = "force-dynamic";

export default function ITCCheckLayout({ children }: { children: React.ReactNode }) {
  return <Sidebar>{children}</Sidebar>;
}
