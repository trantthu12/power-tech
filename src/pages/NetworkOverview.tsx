import { KpiCard } from "@/components/ui/KpiCard";
import { TopStations } from "@/components/TopStations";
import { EnergyByZip } from "@/components/EnergyByZip";
import { StationMap } from "@/components/StationMap";
import { useNetworkKpis } from "@/lib/queries";
import { formatCompact, formatNumber } from "@/lib/format";

export function NetworkOverview() {
  const { data: kpis, isLoading } = useNetworkKpis();

  return (
    <div className="space-y-5">
      {/* KPI grid — all real City of Boulder data */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
      </div>

      {/* Top stations + ZIP coverage */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopStations />
        <EnergyByZip />
      </div>

      <StationMap />
    </div>
  );
}
