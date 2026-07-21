import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Heatmap } from "@/components/charts/Heatmap";
import { Skeleton } from "@/components/ui/Skeleton";
import { SimulatedNote } from "@/components/ui/SimulatedNote";
import { useSites, useUtilizationHeatmap, useLoadStats } from "@/lib/queries";
import { formatNumber } from "@/lib/format";

function formatHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

export function LoadUtilization() {
  const { data: sites } = useSites();
  const [siteId, setSiteId] = useState("");
  const heatmap = useUtilizationHeatmap(siteId || undefined);
  const stats = useLoadStats(siteId || undefined);

  const sortedSites = [...(sites ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const selectedName = siteId
    ? sites?.find((s) => s.id === siteId)?.name ?? "—"
    : "All stations";

  return (
    <div className="space-y-5">
      {/* Stat tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Port Occupancy"
          value={stats.data ? `${stats.data.portOccupancyPct}%` : "—"}
          accent
          simulated
          loading={stats.isLoading}
        />
        <KpiCard
          label="Peak Hour"
          value={stats.data ? formatHour(stats.data.peakHour) : "—"}
          simulated
          loading={stats.isLoading}
        />
        <KpiCard
          label="Peak Load"
          value={stats.data ? formatNumber(stats.data.peakLoadKwh) : "—"}
          unit="kWh/h"
          simulated
          loading={stats.isLoading}
        />
        <KpiCard
          label="Total Energy"
          value={stats.data ? formatNumber(stats.data.totalEnergyKwh) : "—"}
          unit="kWh"
          simulated
          loading={stats.isLoading}
        />
      </div>

      <Card>
        <CardHeader
          title="Hourly Demand Heatmap"
          subtitle={`24×7 energy demand — ${selectedName}`}
          simulated
          action={
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="max-w-[220px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-navy-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            >
              <option value="">All stations</option>
              {sortedSites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.city}
                </option>
              ))}
            </select>
          }
        />
        {heatmap.data ? (
          <Heatmap data={heatmap.data} color="#5fa32f" valueSuffix=" kWh" />
        ) : (
          <Skeleton className="h-[240px] w-full rounded-lg" />
        )}
        <p className="mt-3 text-xs text-slate-400">
          Each cell is total energy (kWh) for that hour &amp; weekday. Darker =
          higher demand — helps the Load Manager spot peak hours and avoid grid
          overload.
        </p>
      </Card>

      <SimulatedNote />
    </div>
  );
}
