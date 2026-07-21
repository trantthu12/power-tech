import { KpiCard } from "@/components/ui/KpiCard";
import { StatusBanner } from "@/components/StatusBanner";
import { ConnectorDonut } from "@/components/ConnectorDonut";
import { CityBreakdown } from "@/components/CityBreakdown";
import { FaultsCard } from "@/components/FaultsCard";
import { StationMap } from "@/components/StationMap";
import { SimulatedNote } from "@/components/ui/SimulatedNote";
import { useNetworkKpis } from "@/lib/queries";
import { formatCompact, formatCurrency, formatNumber } from "@/lib/format";

export function NetworkOverview() {
  const { data: kpis } = useNetworkKpis();

  return (
    <div className="space-y-5">
      <StatusBanner />

      {/* KPI row 1 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="New Charging Stations"
          value={kpis ? formatNumber(kpis.newChargingStations) : "—"}        />
        <KpiCard
          label="Active Charging Sessions"
          value={kpis ? formatNumber(kpis.activeSessions) : "—"}
          accent
          simulated
        />
        <KpiCard
          label="Charging Sessions"
          value={kpis ? formatCompact(kpis.totalSessions) : "—"}
          simulated
        />
      </div>

      {/* KPI row 2 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Total Energy"
          value={kpis ? formatNumber(kpis.totalEnergyKwh) : "—"}
          unit="kWh"
          simulated
        />
        <KpiCard
          label="Total Revenue"
          value={kpis ? formatCurrency(kpis.totalRevenue) : "—"}
          simulated
        />
        <KpiCard
          label="New Users"
          value={kpis ? formatNumber(kpis.newUsers) : "—"}
          simulated
        />
      </div>

      {/* KPI row 3 + donuts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <FaultsCard />
        <ConnectorDonut />
        <CityBreakdown />
      </div>

      <StationMap />

      <SimulatedNote />
    </div>
  );
}
