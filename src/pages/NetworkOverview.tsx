import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { WipCard } from "@/components/ui/WipCard";
import { TopStations } from "@/components/TopStations";
import { EnergyByZip } from "@/components/EnergyByZip";
import { StationMap } from "@/components/StationMap";
import { useNetworkKpis } from "@/lib/queries";
import { formatCompact, formatNumber } from "@/lib/format";

/** AC (Level 2) vs DC fast share of the operated network. */
function ChargerMix({ acPct, loading }: { acPct?: number; loading: boolean }) {
  const dcPct = acPct != null ? 100 - acPct : undefined;
  return (
    <Card>
      <CardHeader title="Charger Types" subtitle="Share of stations by power type" />
      {loading || acPct == null ? (
        <div className="h-24" />
      ) : (
        <div className="space-y-4">
          {[
            { label: "AC — Level 2 (J1772)", pct: acPct, color: "#2a78d6" },
            { label: "DC Fast (CCS · CHAdeMO)", pct: dcPct ?? 0, color: "#008300" },
          ].map((r) => (
            <div key={r.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-slate-600">{r.label}</span>
                <span className="font-semibold text-navy-800">{r.pct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${r.pct}%`, backgroundColor: r.color }}
                />
              </div>
            </div>
          ))}
          <p className="text-xs text-slate-400">
            The city-operated fleet is entirely Level 2 (AC) — no DC fast charging,
            a clear expansion gap.
          </p>
        </div>
      )}
    </Card>
  );
}

export function NetworkOverview() {
  const { data: kpis, isLoading } = useNetworkKpis();

  return (
    <div className="space-y-5">
      {/* KPI grid — all real City of Boulder data */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Total Charging Stations"
          value={kpis ? formatNumber(kpis.totalStations) : "—"}
          loading={isLoading}
        />
        <KpiCard
          label="Charging Sessions"
          value={kpis ? formatCompact(kpis.totalSessions) : "—"}
          loading={isLoading}
        />
        <KpiCard
          label="Total Energy"
          value={kpis ? formatNumber(kpis.totalEnergyKwh) : "—"}
          unit="kWh"
          loading={isLoading}
        />
        <KpiCard
          label="CO₂ Avoided"
          value={kpis ? formatNumber(kpis.totalCo2Kg) : "—"}
          unit="kg"
          accent
          loading={isLoading}
        />
        <KpiCard
          label="Gasoline Saved"
          value={kpis ? formatNumber(kpis.totalGasolineGal) : "—"}
          unit="gal"
          accent
          loading={isLoading}
        />
        <KpiCard
          label="Charger Utilization"
          value={kpis ? `${kpis.avgUtilizationPct}%` : "—"}
          loading={isLoading}
        />
      </div>

      {/* Top stations per area + energy per area */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopStations />
        <EnergyByZip />
      </div>

      {/* Charger mix (real) + Sprint 3 holding cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChargerMix acPct={kpis?.acSharePct} loading={isLoading} />
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
