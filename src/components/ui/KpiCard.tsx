import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "./Skeleton";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  badge?: string;
  deltaPct?: number;
  accent?: boolean;
  /** Show a shimmer placeholder instead of the value. */
  loading?: boolean;
  /** City-exclusive tint: blue = Palo Alto-only, pink = Boulder-only. */
  tint?: "blue" | "pink";
  /** Small formula/explanation line shown under the value. */
  hint?: string;
}

const TINTS = {
  blue: "border-blue-200 bg-blue-50",
  pink: "border-pink-200 bg-pink-50",
} as const;

export function KpiCard({
  label,
  value,
  unit,
  badge,
  deltaPct,
  accent = false,
  loading = false,
  tint,
  hint,
}: KpiCardProps) {
  return (
    <div
      className={`min-w-0 rounded-xl border p-5 shadow-sm ${
        tint ? TINTS[tint] : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-navy-700">{label}</span>
        {badge && (
          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">
            {badge}
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-28" />
      ) : (
        <div className="flex items-end gap-1.5">
          <span
            className={`text-3xl font-bold leading-none ${
              accent ? "text-brand-600" : "text-navy-800"
            }`}
          >
            {value}
          </span>
          {unit && <span className="pb-0.5 text-sm text-slate-400">{unit}</span>}
        </div>
      )}
      {!loading && hint && (
        <p className="mt-2 text-[11px] leading-snug text-slate-400">{hint}</p>
      )}
      {!loading && deltaPct !== undefined && (
        <div
          className={`mt-2 flex items-center gap-1 text-xs font-medium ${
            deltaPct >= 0 ? "text-brand-600" : "text-rose-500"
          }`}
        >
          {deltaPct >= 0 ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
          )}
          {Math.abs(deltaPct).toFixed(1)}% vs prev
        </div>
      )}
    </div>
  );
}
