import { Card, CardHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { InfraGrowthChart } from "@/components/charts/InfraGrowthChart";
import { PublicStationMap } from "@/components/PublicStationMap";
import {
  useInfraStats,
  useStationsByNetwork,
  useConnectorMix,
  useInfraGrowth,
} from "@/lib/queries";
import { formatNumber } from "@/lib/format";
import { CATEGORICAL as COLORS, CONNECTOR_COLORS } from "@/lib/colors";

/** Horizontal proportional bar list (same visual language as Energy by ZIP). */
function BarList({
  rows,
  colorAt,
}: {
  rows: { label: string; value: number; sub?: string }[];
  colorAt: (i: number, label: string) => string;
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0) || 1;
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 text-slate-600">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: colorAt(i, r.label) }}
              />
              {r.label}
            </span>
            <span className="font-medium text-navy-800">
              {formatNumber(r.value)}
              {r.sub ? <span className="ml-1 text-xs font-normal text-slate-400">{r.sub}</span> : null}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${(r.value / max) * 100}%`, backgroundColor: colorAt(i, r.label) }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function InfrastructurePlanning() {
  const stats = useInfraStats();
  const byNetwork = useStationsByNetwork();
  const connectors = useConnectorMix();
  const growth = useInfraGrowth();

  const s = stats.data;

  return (
    <div className="space-y-5">
      {/* KPI row — real public-station inventory */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Public Stations"
          value={s ? formatNumber(s.totalStations) : "—"}
          accent
          loading={stats.isLoading}
        />
        <KpiCard
          label="Charging Ports"
          value={s ? formatNumber(s.l2Ports + s.dcFastPorts) : "—"}
          unit="L2"
          loading={stats.isLoading}
        />
        <KpiCard
          label="DC Fast Ports"
          value={s ? formatNumber(s.dcFastPorts) : "—"}
          loading={stats.isLoading}
        />
        <KpiCard
          label="Charging Networks"
          value={s ? formatNumber(s.networks) : "—"}
          loading={stats.isLoading}
        />
        <KpiCard
          label={`Opened in ${s?.newestYear ?? ""}`}
          value={s ? formatNumber(s.newestYearCount) : "—"}
          unit="new"
          loading={stats.isLoading}
        />
      </div>

      {/* Network + connector mix */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Charging Networks"
            subtitle="Public stations by operator — Boulder, CO"
          />
          {byNetwork.data ? (
            <BarList
              rows={byNetwork.data.map((n) => ({
                label: n.network,
                value: n.stations,
                sub: `${n.ports} ports`,
              }))}
              colorAt={(i) => COLORS[i % COLORS.length]}
            />
          ) : (
            <Skeleton className="h-64 w-full rounded-lg" />
          )}
        </Card>

        <Card>
          <CardHeader
            title="Connector Types"
            subtitle="Stations supporting each plug standard"
          />
          {connectors.data ? (
            <BarList
              rows={connectors.data.map((c) => ({ label: c.connector, value: c.stations }))}
              colorAt={(i, label) => CONNECTOR_COLORS[label] ?? COLORS[i % COLORS.length]}
            />
          ) : (
            <Skeleton className="h-64 w-full rounded-lg" />
          )}
          <p className="mt-4 text-xs text-slate-400">
            Boulder's public network is entirely Level 2 today — no DC fast
            chargers — a clear expansion gap for the Network Planner.
          </p>
        </Card>
      </div>

      {/* Growth */}
      <Card>
        <CardHeader
          title="Infrastructure Growth"
          subtitle="Public charging stations opened per year (bars) & cumulative total (area)"
        />
        {growth.data ? (
          <InfraGrowthChart data={growth.data} />
        ) : (
          <Skeleton className="h-64 w-full rounded-lg" />
        )}
      </Card>

      <PublicStationMap />

      <p className="text-xs text-slate-400">
        Source: Colorado open data — Alternative Fuels &amp; EV Charging Stations
        (US DOE Alternative Fuels Data Center). Public stations only.
      </p>
    </div>
  );
}
