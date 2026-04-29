import { supabaseServer } from "@/lib/supabase/client";
import Link from "next/link";

async function fetchCAViewData(parentTrialId: string) {
  const { data: transactions } = await supabaseServer
    .from("transactions")
    .select("id, transaction_date, description, amount, itc_status, gst_amount, mapped_vendor_name, block_reason")
    .eq("trial_id", parentTrialId)
    .order("transaction_date", { ascending: false })
    .limit(100);

  return { transactions: transactions || [] };
}

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

export default async function CAViewerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const { data: caShare } = await supabaseServer
    .from("ca_shares")
    .select("parent_trial_id, expires_at")
    .eq("ca_token", token)
    .single();

  if (!caShare) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-2">Invalid Link</h1>
          <p className="text-gray-400">This CA sharing link is invalid or has expired.</p>
          <Link href="/" className="mt-4 inline-block text-cyan-400 underline text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (new Date(caShare.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-amber-400 mb-2">Link Expired</h1>
          <p className="text-gray-400">This CA sharing link has expired. Please request a new one.</p>
          <Link href="/" className="mt-4 inline-block text-cyan-400 underline text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const { transactions } = await fetchCAViewData(caShare.parent_trial_id);

  const eligible = transactions
    .filter((t: any) => t.itc_status === "ELIGIBLE")
    .reduce((sum: number, t: any) => sum + t.gst_amount, 0);
  const blocked = transactions
    .filter((t: any) => t.itc_status === "BLOCKED")
    .reduce((sum: number, t: any) => sum + t.gst_amount, 0);
  const rcm = transactions
    .filter((t: any) => t.itc_status === "RCM")
    .reduce((sum: number, t: any) => sum + t.gst_amount, 0);

  const STATUS_BADGE: Record<string, string> = {
    ELIGIBLE: "bg-emerald-500/15 text-emerald-400",
    BLOCKED: "bg-red-500/15 text-red-400",
    RCM: "bg-amber-500/15 text-amber-400",
    CONDITIONAL: "bg-orange-500/15 text-orange-400",
    UNKNOWN: "bg-gray-500/15 text-gray-400",
  };

  return (
    <div className="min-h-screen bg-void p-6 sm:p-10 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">CA View — ITC Summary</h1>
            <p className="text-sm text-gray-500 mt-1">Read-only sharing view</p>
          </div>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            ← Apex AGI Solutions
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Total Transactions" value={String(transactions.length)} />
          <MetricCard label="Eligible ITC" value={formatPaise(eligible)} color="text-emerald-400" />
          <MetricCard label="Blocked" value={formatPaise(blocked)} color="text-red-400" />
          <MetricCard label="RCM Payable" value={formatPaise(rcm)} color="text-amber-400" />
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900/80 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Vendor</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">GST</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {transactions.map((txn: any) => (
                <tr key={txn.id} className="hover:bg-gray-900/30 transition-colors">
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {new Date(txn.transaction_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </td>
                  <td className="px-4 py-3 text-gray-200 max-w-[250px] truncate">{txn.description}</td>
                  <td className="px-4 py-3 text-gray-400">{txn.mapped_vendor_name || "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-200 font-mono">{formatPaise(txn.amount)}</td>
                  <td className="px-4 py-3 text-right text-gray-400 font-mono">{formatPaise(txn.gst_amount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[txn.itc_status] || STATUS_BADGE.UNKNOWN}`}>
                      {txn.itc_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-600 text-center">
          Expires: {new Date(caShare.expires_at).toLocaleDateString("en-IN")} · Read-only view for Chartered Accountant review
        </p>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color = "text-white" }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
      <h3 className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">{label}</h3>
      <p className={`text-xl font-light font-mono ${color}`}>{value}</p>
    </div>
  );
}
