import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { WipCard } from "@/components/ui/WipCard";
import { TopStations } from "@/components/TopStations";
import { EnergyByZip } from "@/components/EnergyByZip";
import { StationMap } from "@/components/StationMap";
import { TrendChart } from "@/components/charts/TrendChart";
import { useNetworkKpis, useChargerPowerMix, useEnergySeries } from "@/lib/queries";
import { useFilter } from "@/lib/filter-context";
import { formatCompact, formatNumber } from "@/lib/format";

const RANGE_LABEL: Record<string, string> = {
  day: "last 30 days",
  week: "last 90 days",
  month: "last 12 months",
};

const RANGES = [
  { g: "day", label: "30 days" },
  { g: "week", label: "90 days" },
  { g: "month", label: "12 months" },
] as const;

/** AC vs DC split of the Boulder public charging network (real AFDC connectors). */
function ChargerMix() {
  const { data, isLoading } = useChargerPowerMix();
  const total = data?.total ?? 0;
  const pct = (n: number) => (total ? Math.round((100 * n) / total) : 0);
  return (
    <Card>
      <CardHeader
        title="Charger Types (AC / DC)"
        subtitle="City-operated fleet, stations by power type"
      />
      {isLoading || !data ? (
        <div className="h-24" />
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-3xl font-bold tracking-tight text-navy-900">
              {formatNumber(data.total)}
            </p>
            <p className="text-xs text-slate-400">Total city-operated stations</p>
          </div>
          {[
            { label: "AC, Level 2 (J1772)", n: data.ac, color: "#2a78d6" },
            { label: "DC Fast (CCS, CHAdeMO)", n: data.dc, color: "#008300" },
          ].map((r) => (
            <div key={r.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-slate-600">{r.label}</span>
                <span className="font-semibold text-navy-800">
                  {formatNumber(r.n)}{" "}
                  <span className="text-xs font-normal text-slate-400">({pct(r.n)}%)</span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct(r.n)}%`, backgroundColor: r.color }}
                />
              </div>
            </div>
          ))}
          <p className="text-xs text-slate-400">
            All {formatNumber(data.total)} city-operated stations are Level 2 (AC).
            DC fast charging is a planned expansion (Infrastructure Planning,
            Sprint 3).
          </p>
        </div>
      )}
    </Card>
  );
}

export function NetworkOverview() {
  const { data: kpis, isLoading } = useNetworkKpis();
  const { filter, setGranularity } = useFilter();
  const energySeries = useEnergySeries();

  return (
    <div className="space-y-5">
      {/* OVER TIME — everything the range selector can drive */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-navy-800">
            Over time
            <span className="ml-2 font-normal text-slate-400">follows the range selector →</span>
          </h2>
          <div className="inline-flex items-center gap-1 rounded-lg bg-white p-1 shadow-sm ring-1 ring-slate-200">
            {RANGES.map((r) => (
              <button
                key={r.g}
                onClick={() => setGranularity(r.g)}
                className={[
                  "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3",
                  filter.granularity === r.g
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-slate-500 hover:text-navy-700",
                ].join(" ")}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <KpiCard
            label="Charging Sessions"
            value={kpis ? formatCompact(kpis.totalSessions) : "—"}
            loading={isLoading}
            hint="Completed charging sessions."
          />
          <KpiCard
            label="Total Energy"
            value={kpis ? formatNumber(kpis.totalEnergyKwh) : "—"}
            unit="kWh"
            loading={isLoading}
            hint="Energy delivered to vehicles."
          />
          <KpiCard
            label="CO₂ Avoided"
            value={kpis ? formatNumber(kpis.totalCo2Kg) : "—"}
            unit="kg"
            accent
            loading={isLoading}
            hint="Vs equivalent gasoline cars."
          />
          <KpiCard
            label="Gasoline Saved"
            value={kpis ? formatNumber(kpis.totalGasolineGal) : "—"}
            unit="gal"
            accent
            loading={isLoading}
            hint="Fuel displaced by EV charging."
          />
          <KpiCard
            label="Charging Efficiency"
            value={kpis ? `${kpis.avgUtilizationPct}%` : "—"}
            loading={isLoading}
            hint="Time charging / time plugged in."
          />
        </div>
        <Card>
          <CardHeader
            title="Energy Delivered"
            subtitle={`Total kWh, ${RANGE_LABEL[filter.granularity] ?? "selected range"}`}
          />
          {energySeries.data && (
            <TrendChart
              data={energySeries.data}
              granularity={filter.granularity}
              color="#7ac943"
              valueFormatter={(v) => `${formatNumber(v)} kWh`}
            />
          )}
        </Card>
      </section>

      {/* Top stations per area + energy per area */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopStations />
        <EnergyByZip />
      </div>

      {/* Charger mix (real) + Sprint 3 holding cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChargerMix />
        <WipCard
          title="Uptime / Downtime"
          subtitle="Station availability over time"
          planned={["Live online/offline status", "Uptime % per station", "Downtime timeline"]}
        />
        <WipCard
          title="Faults & Alerts"
          subtitle="Reliability hot-spots"
          planned={["Top 5 most common faults", "Top 3 fault-prone stations per area", "Risk-ranked alerts"]}
        />
      </div>

      <StationMap />
    </div>
  );
}
