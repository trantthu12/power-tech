import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Heatmap } from "@/components/charts/Heatmap";
import { ForecastChart } from "@/components/charts/ForecastChart";
import { LoadOptimizationPanel } from "@/components/LoadOptimizationPanel";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useSites,
  useUtilizationHeatmap,
  useLoadStats,
  useDemandForecast,
  useLoadOptimization,
} from "@/lib/queries";
import { formatNumber } from "@/lib/format";

function formatHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

export function LoadUtilization() {
  const { data: sites } = useSites();
  const [siteId, setSiteId] = useState("");
  const heatmap = useUtilizationHeatmap(siteId || undefined);
  const stats = useLoadStats(siteId || undefined);
  const forecast = useDemandForecast(siteId || undefined);
  const optimization = useLoadOptimization(siteId || undefined);

  const sortedSites = [...(sites ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const selectedName = siteId
    ? sites?.find((s) => s.id === siteId)?.name ?? "—"
    : "All stations";

  return (
    <div className="space-y-5">
      {/* Stat tiles — all real */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Charger Utilization"
          value={stats.data ? `${stats.data.avgUtilizationPct}%` : "—"}
          accent
          loading={stats.isLoading}
        />
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
        <KpiCard
          label="Total Energy"
          value={stats.data ? formatNumber(stats.data.totalEnergyKwh) : "—"}
          unit="kWh"
          loading={stats.isLoading}
        />
        <KpiCard
          label="CO₂ Avoided"
          value={stats.data ? formatNumber(stats.data.totalCo2Kg) : "—"}
          unit="kg"
          loading={stats.isLoading}
        />
      </div>

      <Card>
        <CardHeader
          title="Hourly Demand Heatmap"
          subtitle={`24×7 energy demand — ${selectedName}`}
          action={
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="max-w-[220px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-navy-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            >
              <option value="">All stations</option>
              {sortedSites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
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

      {/* Forecast + optimization (analysis of the real demand pattern) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="48-Hour Demand Forecast"
            subtitle={`Projected from the real demand pattern — ${selectedName}`}
          />
          {forecast.data ? (
            <ForecastChart data={forecast.data} />
          ) : (
            <Skeleton className="h-56 w-full rounded-lg" />
          )}
          <p className="mt-3 text-xs text-slate-400">
            Dashed line = projected next-48h demand from the historical hourly
            pattern — lets the Load Manager pre-plan capacity.
          </p>
        </Card>

        <Card>
          <CardHeader
            title="Load Optimization"
            subtitle="Where to shift charging to flatten the peak"
          />
          {optimization.data ? (
            <LoadOptimizationPanel data={optimization.data} />
          ) : (
            <Skeleton className="h-56 w-full rounded-lg" />
          )}
        </Card>
      </div>
    </div>
  );
}
