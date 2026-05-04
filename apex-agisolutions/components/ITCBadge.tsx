"use client";

const ITC_COLORS: Record<string, string> = {
  ELIGIBLE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  BLOCKED: "bg-red-500/10 text-red-400 border-red-500/30",
  RCM: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  NEEDS_INVOICE: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  TIME_BARRED: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  PERSONAL: "bg-gray-500/10 text-gray-400 border-gray-500/30",
  UNKNOWN: "bg-gray-500/10 text-gray-500 border-gray-500/30",
};

const ITC_LABELS: Record<string, string> = {
  ELIGIBLE: "ITC Eligible",
  BLOCKED: "ITC Blocked",
  RCM: "RCM",
  NEEDS_INVOICE: "Needs Invoice",
  TIME_BARRED: "Time Barred",
  PERSONAL: "Personal",
  UNKNOWN: "Unknown",
};

export default function ITCBadge({ status }: { status: string }) {
  const colors = ITC_COLORS[status] || ITC_COLORS.UNKNOWN;
  const label = ITC_LABELS[status] || status;

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${colors}`}>
      {label}
    </span>
  );
}
