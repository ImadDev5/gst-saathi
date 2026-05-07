"use client";

import { statusLabel, statusColor } from "@/lib/tax-terms";

const COLOR_CLASSES: Record<string, { dot: string; bg: string; text: string }> = {
  green: { dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  red: { dot: "bg-rose-500", bg: "bg-rose-50", text: "text-rose-700" },
  amber: { dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700" },
  grey: { dot: "bg-slate-400", bg: "bg-slate-100", text: "text-slate-600" },
};

interface ITCBadgeProps {
  status: string;
  size?: "sm" | "default";
}

export default function ITCBadge({ status, size = "default" }: ITCBadgeProps) {
  const label = statusLabel(status);
  const color = statusColor(status);
  const c = COLOR_CLASSES[color] || COLOR_CLASSES.grey;

  const sizeClasses = size === "sm"
    ? "px-1.5 py-px text-[10px] gap-1"
    : "px-2.5 py-0.5 text-[11px] gap-1.5";

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${c.bg} ${c.text}`}>
      <span className={`rounded-full ${size === "sm" ? "w-1 h-1" : "w-1.5 h-1.5"} ${c.dot}`} />
      {label}
    </span>
  );
}
