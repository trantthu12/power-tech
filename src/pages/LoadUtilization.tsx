import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Heatmap } from "@/components/charts/Heatmap";
import { ForecastChart } from "@/components/charts/ForecastChart";
import { StationHourlyChart } from "@/components/charts/StationHourlyChart";
import { MultiStationSelect } from "@/components/ui/MultiStationSelect";
import { LoadOptimizationPanel } from "@/components/LoadOptimizationPanel";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useSites,
  useUtilizationHeatmap,
  useLoadStats,
  useDemandForecast,
  useLoadOptimization,
  useStationOptions,
  useStationHourly,
  useExpansionSignals,
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
  const stationOptions = useStationOptions();
  // Default to the 5 busiest stations once the options load.
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  useEffect(() => {
    if (stationOptions.data && selectedStations.length === 0) {
      setSelectedStations(stationOptions.data.slice(0, 5).map((o) => o.id));
    }
  }, [stationOptions.data, selectedStations.length]);
  const stationHourly = useStationHourly(selectedStations);
  const expansion = useExpansionSignals();

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

      {/* Per-station hourly energy — pick up to 5 stations */}
      <Card>
        <CardHeader
          title="Hourly Energy by Station"
          subtitle="Average energy (kWh) per hour of day — choose up to 5 stations"
          action={
            <MultiStationSelect
              options={stationOptions.data ?? []}
              selected={selectedStations}
              onChange={setSelectedStations}
              max={5}
            />
          }
        />
        {stationHourly.data && stationHourly.data.series.length ? (
          <StationHourlyChart
            rows={stationHourly.data.rows}
            series={stationHourly.data.series}
          />
        ) : selectedStations.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-slate-400">
            Select at least one station to plot.
          </div>
        ) : (
          <Skeleton className="h-72 w-full rounded-lg" />
        )}
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

      {/* Expansion recommendation — highest-demand areas first */}
      <Card>
        <CardHeader
          title="Expansion Recommendation"
          subtitle="Areas ranked by demand intensity (energy per station) over the full dataset"
        />
        {expansion.data ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-slate-100 text-xs text-navy-700">
                  <tr>
                    <th className="py-2 pr-4 font-semibold">Area (ZIP)</th>
                    <th className="py-2 pr-4 text-right font-semibold">Stations</th>
                    <th className="py-2 pr-4 text-right font-semibold">Energy / Station</th>
                    <th className="py-2 pr-4 text-right font-semibold">Utilization</th>
                    <th className="py-2 font-semibold">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {expansion.data.map((a, i) => (
                    <tr key={a.zip} className="border-b border-slate-50">
                      <td className="py-2.5 pr-4 font-medium text-navy-800">{a.zip}</td>
                      <td className="py-2.5 pr-4 text-right text-slate-600">{a.stations}</td>
                      <td className="py-2.5 pr-4 text-right text-slate-600">
                        {formatNumber(a.energyPerStation)} kWh
                      </td>
                      <td className="py-2.5 pr-4 text-right text-slate-600">{a.utilizationPct}%</td>
                      <td className="py-2.5">
                        {i < 2 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                            <TrendingUp className="h-3 w-3" />
                            Expand
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Monitor</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Ranked by real demand intensity + charger utilization. (True port
              occupancy needs station capacity data, planned for Sprint 3 — this
              uses demand-per-station as the available proxy.)
            </p>
          </>
        ) : (
          <Skeleton className="h-40 w-full rounded-lg" />
        )}
      </Card>
    </div>
  );
}
