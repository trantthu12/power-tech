import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { TrendChart } from "@/components/charts/TrendChart";
import { SiteComparisonChart } from "@/components/charts/SiteComparisonChart";
import { Heatmap } from "@/components/charts/Heatmap";
import { GranularityToggle } from "@/components/ui/GranularityToggle";
import type { Granularity } from "@/types";
import {
  useEnergyTrend,
  useCo2Trend,
  usePerformanceStats,
  useSiteComparison,
  useUtilizationHeatmap,
  useCo2Heatmap,
} from "@/lib/queries";
import { formatNumber } from "@/lib/format";

export function PerformanceAnalytics() {
  const [granularity, setGranularity] = useState<Granularity>("month");
  const { data: stats, isLoading: statsLoading } = usePerformanceStats();
  const energy = useEnergyTrend(granularity);
  const co2 = useCo2Trend(granularity);
  const sites = useSiteComparison();
  const utilization = useUtilizationHeatmap();
  const co2Heat = useCo2Heatmap();

  return (
    <div className="space-y-5">
      {/* Stat tiles — all real */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Avg Session Duration"
          value={stats ? stats.avgSessionDurationMin : "—"}
          unit="min"
          loading={statsLoading}
        />
        <KpiCard
          label="Avg Energy / Session"
          value={stats ? stats.avgEnergyPerSession : "—"}
          unit="kWh"
          loading={statsLoading}
        />
        <KpiCard
          label="Sessions / Day"
          value={stats ? formatNumber(stats.sessionsPerDay) : "—"}
          loading={statsLoading}
        />
        <KpiCard
          label="CO₂ Avoided"
          value={stats ? formatNumber(stats.totalCo2Kg) : "—"}
          unit="kg"
          accent
          loading={statsLoading}
        />
      </div>

      {/* Trends */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-navy-800">Trends</h2>
        <GranularityToggle value={granularity} onChange={setGranularity} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Energy Delivered" subtitle={`Total kWh per ${granularity}`} />
          {energy.data && (
            <TrendChart
              data={energy.data}
              granularity={granularity}
              color="#7ac943"
              valueFormatter={(v) => `${formatNumber(v)} kWh`}
            />
          )}
        </Card>
        <Card>
          <CardHeader title="CO₂ Avoided" subtitle={`Total kg per ${granularity}`} />
          {co2.data && (
            <TrendChart
              data={co2.data}
              granularity={granularity}
              color="#5fa32f"
              valueFormatter={(v) => `${formatNumber(v)} kg`}
            />
          )}
        </Card>
      </div>

      {/* Site comparison */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Site Comparison — Energy" subtitle="Top sites by kWh · all-time" />
          {sites.data && <SiteComparisonChart data={sites.data} metric="energyKwh" />}
        </Card>
        <Card>
          <CardHeader title="Site Comparison — Sessions" subtitle="Top sites by session count · all-time" />
          {sites.data && <SiteComparisonChart data={sites.data} metric="sessions" />}
        </Card>
      </div>

      {/* Heatmaps */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Utilization Heatmap" subtitle="Energy demand by day & hour · all-time" />
          {utilization.data && <Heatmap data={utilization.data} color="#5fa32f" valueSuffix=" kWh" />}
        </Card>
        <Card>
          <CardHeader title="CO₂ Heatmap" subtitle="CO₂ avoided by day & hour · all-time" />
          {co2Heat.data && <Heatmap data={co2Heat.data} color="#3b4a6b" valueSuffix=" kg" />}
        </Card>
      </div>
    </div>
  );
}
