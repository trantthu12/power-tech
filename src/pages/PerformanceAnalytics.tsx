import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { TrendChart } from "@/components/charts/TrendChart";
import { SiteComparisonChart } from "@/components/charts/SiteComparisonChart";
import { Heatmap } from "@/components/charts/Heatmap";
import { WeekdayWeekendChart } from "@/components/charts/WeekdayWeekendChart";
import { GranularityToggle } from "@/components/ui/GranularityToggle";
import type { Granularity } from "@/types";
import {
  useEnergyTrend,
  useSessionsTrend,
  usePerformanceStats,
  useSiteComparison,
  useUtilizationHeatmap,
  useWeekdayWeekendProfile,
} from "@/lib/queries";
import { formatNumber, formatCurrency } from "@/lib/format";
import { useCity } from "@/lib/city-context";

export function PerformanceAnalytics() {
  const { city } = useCity();
  const [granularity, setGranularity] = useState<Granularity>("month");
  const { data: stats, isLoading: statsLoading } = usePerformanceStats();
  const energy = useEnergyTrend(granularity);
  const sessions = useSessionsTrend(granularity);
  const sites = useSiteComparison();
  const utilization = useUtilizationHeatmap();
  const profile = useWeekdayWeekendProfile();

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

      {/* Drivers — only where the dataset has a customer/driver ID (Palo Alto, New York) */}
      {stats?.uniqueDrivers != null && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-navy-800">
            Drivers{" "}
            <span className="font-normal text-slate-400">· from real driver IDs</span>
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <KpiCard
              label="Registered Drivers"
              value={formatNumber(stats.uniqueDrivers)}
              tint="blue"
              loading={statsLoading}
            />
            <KpiCard
              label="Avg Charges / Driver"
              value={stats.sessionsPerDriver ?? "—"}
              tint="blue"
              loading={statsLoading}
            />
          </div>
        </div>
      )}

      {/* Financials (estimated) */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-navy-800">
          Financials{" "}
          <span className="font-normal text-slate-400">· estimated</span>
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard
            label="Total Revenue"
            value={stats ? formatCurrency(stats.totalRevenue) : "—"}
            badge={city === "palo-alto" ? "real" : "est."}
            loading={statsLoading}
          />
          <KpiCard
            label="Avg Revenue / Session"
            value={stats ? formatCurrency(stats.avgRevenuePerSession) : "—"}
            badge={city === "palo-alto" ? "real" : "est."}
            loading={statsLoading}
          />
          <KpiCard
            label="Electricity Cost"
            value={stats ? formatCurrency(stats.electricityCost) : "—"}
            badge="est."
            loading={statsLoading}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {city === "palo-alto"
            ? "Revenue is the real billed Fee from the City of Palo Alto ChargePoint dataset (actual charges, not an estimate). Electricity cost assumes ~$0.11/kWh (commercial rate)."
            : city === "new-york"
            ? "Revenue estimated at ~$0.25/kWh applied to real session energy — the NYC open dataset does not publish pricing. Electricity cost assumes ~$0.11/kWh (commercial rate)."
            : "Revenue estimated from the real City of Boulder Level 2 tariff ($1/hr for the first 2 hours, $2.50/hr for hours 3 to 4, 4-hour cap) applied to real session durations. Electricity cost assumes ~$0.11/kWh (Xcel Energy Colorado commercial rate). The open dataset does not include revenue."}
        </p>
      </div>

      {/* OVER TIME — the only filterable section (everything below is all-time) */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-navy-800">Over time</h2>
            <p className="text-xs text-slate-400">Both charts follow this selector.</p>
          </div>
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
            <CardHeader
              title="Charging Sessions"
              subtitle={`Total sessions per ${granularity}, EV adoption over time`}
            />
            {sessions.data && (
              <TrendChart
                data={sessions.data}
                granularity={granularity}
                color="#2a78d6"
                valueFormatter={(v) => `${formatNumber(v)} sessions`}
              />
            )}
          </Card>
        </div>
      </section>

      {/* Site comparison */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Site Comparison, Energy" subtitle="Top sites by kWh" />
          {sites.data && <SiteComparisonChart data={sites.data} metric="energyKwh" />}
        </Card>
        <Card>
          <CardHeader title="Site Comparison, Sessions" subtitle="Top sites by session count" />
          {sites.data && <SiteComparisonChart data={sites.data} metric="sessions" />}
        </Card>
      </div>

      {/* Heatmaps */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Utilization Heatmap" subtitle="Energy demand by day & hour" />
          {utilization.data && <Heatmap data={utilization.data} color="#5fa32f" valueSuffix=" kWh" />}
        </Card>
        <Card>
          <CardHeader
            title="Weekday vs Weekend"
            subtitle="Avg kWh per hour of day"
          />
          {profile.data && <WeekdayWeekendChart data={profile.data} />}
        </Card>
      </div>
    </div>
  );
}
