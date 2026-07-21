import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  badge?: string;
  deltaPct?: number;
  accent?: boolean;
  /** Mark the value as simulated (adds a small *). */
  simulated?: boolean;
}

export function KpiCard({
  label,
  value,
  unit,
  badge,
  deltaPct,
  accent = false,
  simulated = false,
}: KpiCardProps) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-navy-700">
          {label}
          {simulated && (
            <sup className="ml-0.5 text-brand-500" title="Simulated data">
              *
            </sup>
          )}
        </span>
        {badge && (
          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">
            {badge}
          </span>
        )}
      </div>
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
      {deltaPct !== undefined && (
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
