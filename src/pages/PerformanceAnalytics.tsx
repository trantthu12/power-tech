import { Card, CardHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { TrendChart } from "@/components/charts/TrendChart";
import { SiteComparisonChart } from "@/components/charts/SiteComparisonChart";
import { Heatmap } from "@/components/charts/Heatmap";
import { SimulatedNote } from "@/components/ui/SimulatedNote";
import { useFilter } from "@/lib/filter-context";
import {
  useEnergyTrend,
  usePerformanceStats,
  useRevenueTrend,
  useSiteComparison,
  useUtilizationHeatmap,
  useRevenueHeatmap,
} from "@/lib/queries";
import { formatCurrency, formatEnergy, formatNumber } from "@/lib/format";

export function PerformanceAnalytics() {
  const { filter } = useFilter();
  const { data: stats, isLoading: statsLoading } = usePerformanceStats();
  const energy = useEnergyTrend(filter.granularity);
  const revenue = useRevenueTrend(filter.granularity);
  const sites = useSiteComparison();
  const utilization = useUtilizationHeatmap();
  const revenueHeat = useRevenueHeatmap();

  return (
    <div className="space-y-5">
      {/* Stat tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Avg Session Duration"
          value={stats ? stats.avgSessionDurationMin : "—"}
          unit="min"
          simulated
          loading={statsLoading}
        />
        <KpiCard
          label="Avg Energy / Session"
          value={stats ? stats.avgEnergyPerSession : "—"}
          unit="kWh"
          simulated
          loading={statsLoading}
        />
        <KpiCard
          label="Sessions / Day"
          value={stats ? formatNumber(stats.sessionsPerDay) : "—"}
          simulated
          loading={statsLoading}
        />
        <KpiCard
          label="Charger Utilization"
          value={stats ? `${stats.utilizationPct}%` : "—"}
          accent
          simulated
          loading={statsLoading}
        />
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Energy Delivered"
            subtitle={`Total kWh per ${filter.granularity}`}
            simulated
          />
          {energy.data && (
            <TrendChart
              data={energy.data}
              granularity={filter.granularity}
              color="#7ac943"
              valueFormatter={formatEnergy}
            />
          )}
        </Card>
        <Card>
          <CardHeader
            title="Revenue"
            subtitle={`Total revenue per ${filter.granularity}`}
            simulated
          />
          {revenue.data && (
            <TrendChart
              data={revenue.data}
              granularity={filter.granularity}
              color="#3b4a6b"
              valueFormatter={formatCurrency}
            />
          )}
        </Card>
      </div>

      {/* Site comparison */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Site Comparison — Energy" subtitle="Top sites by kWh" simulated />
          {sites.data && <SiteComparisonChart data={sites.data} metric="energyKwh" />}
        </Card>
        <Card>
          <CardHeader
            title="Site Comparison — Revenue"
            subtitle="Top sites by revenue"
            simulated
          />
          {sites.data && <SiteComparisonChart data={sites.data} metric="revenue" />}
        </Card>
      </div>

      {/* Heatmaps */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Utilization Heatmap"
            subtitle="Energy demand by day & hour"
            simulated
          />
          {utilization.data && <Heatmap data={utilization.data} color="#5fa32f" valueSuffix=" kWh" />}
        </Card>
        <Card>
          <CardHeader title="Revenue Heatmap" subtitle="Revenue by day & hour" simulated />
          {revenueHeat.data && (
            <Heatmap data={revenueHeat.data} color="#3b4a6b" valuePrefix="$" />
          )}
        </Card>
      </div>

      <SimulatedNote />
    </div>
  );
}
