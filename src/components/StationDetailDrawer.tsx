import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { KpiCard } from "@/components/ui/KpiCard";
import { Heatmap } from "@/components/charts/Heatmap";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLoadStats, useUtilizationHeatmap } from "@/lib/queries";
import { formatNumber, formatCurrency } from "@/lib/format";
import type { SiteAgg } from "@/services/mock-data";

function formatHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

/** Slide-in panel showing one station's detail, opened from the Stations table. */
export function StationDetailDrawer({
  site,
  onClose,
}: {
  site: SiteAgg;
  onClose: () => void;
}) {
  const stats = useLoadStats(site.id);
  const heatmap = useUtilizationHeatmap(site.id);

  // Trigger the slide-in after mount, and close on Escape.
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // Flip to open on mount to trigger the slide-in transition.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-label={`${site.name} details`}
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-200 sm:max-w-lg ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-navy-800">{site.name}</h2>
            <p className="truncate text-xs text-slate-400">
              {site.address ? `${site.address} · ` : ""}ZIP {site.zip}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Charging Efficiency" value={`${site.utilizationPct}%`} accent />
            <KpiCard label="Sessions" value={formatNumber(site.sessions)} />
            <KpiCard label="Energy" value={formatNumber(site.energyKwh)} unit="kWh" />
            <KpiCard label="CO₂ Avoided" value={formatNumber(site.co2Kg)} unit="kg" />
            <KpiCard label="Revenue" value={formatCurrency(site.revenue)} />
            <KpiCard label="Avg Duration" value={site.avgDurationMin} unit="min" />
            <KpiCard
              label="Peak Hour"
              value={stats.data ? formatHour(stats.data.peakHour) : "—"}
              loading={stats.isLoading}
            />
            <KpiCard
              label="Peak Load"
              value={stats.data ? formatNumber(stats.data.peakLoadKwh) : "—"}
              unit="kWh/h"
              loading={stats.isLoading}
            />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-navy-800">Hourly Demand</h3>
            <p className="mb-3 text-xs text-slate-400">
              Energy (kWh) by weekday &amp; hour. Darker = higher demand.
            </p>
            {heatmap.data ? (
              <Heatmap data={heatmap.data} color="#5fa32f" valueSuffix=" kWh" />
            ) : (
              <Skeleton className="h-40 w-full rounded-lg" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
