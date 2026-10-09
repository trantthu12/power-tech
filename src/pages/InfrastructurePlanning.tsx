import { useMemo } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { DataBadge } from "@/components/ui/DataBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  AXIS_TICK,
  GRID_STROKE,
  TOOLTIP_LABEL,
  TOOLTIP_STYLE,
  compact,
  monthLabel,
} from "@/components/ops/chart-style";
import { useOpsData, useSites } from "@/lib/queries";
import type { McdaCriterion } from "@/services/ops";
import { formatNumber } from "@/lib/format";

const CRITERIA: { key: McdaCriterion; label: string; color: string }[] = [
  { key: "occupancy", label: "Occupancy", color: "#2a78d6" },
  { key: "growth", label: "Demand growth", color: "#008300" },
  { key: "peakLoad", label: "Peak load vs capacity", color: "#eb6834" },
  { key: "downtime", label: "Downtime", color: "#e87ba4" },
];

/** Stations listed in the priority table. */
const PRIORITY_ROWS = 10;

function pct(v: number | null, digits = 1): string {
  return v == null ? "—" : `${v.toFixed(digits)}%`;
}

function growth(v: number | null): string {
  return v == null ? "new" : `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`;
}

export function InfrastructurePlanning() {
  const { data: ops } = useOpsData();
  const { data: sites } = useSites();
  const names = useMemo(() => new Map(sites?.map((s) => [s.id, s.name])), [sites]);
  const infra = ops?.infrastructure;
  const target = infra?.targetOccupancyPct ?? 20;

  const mcda = infra?.zips.map((z) => ({ zip: z.zip, score: z.score, ...z.criteria })) ?? [];
  const coverage =
    infra?.zips
      .map((z) => {
        const g = Math.min(Math.max((z.growthPct ?? 0) / 100, 0), 1);
        return { ...z, projected: z.occupancyPct * (1 + g) };
      })
      .sort((a, b) => b.projected - a.projected) ?? [];
  const maxOcc = Math.max(target * 1.5, ...coverage.map((z) => z.projected));
  const demand = useMemo(() => {
    if (!infra) return [];
    const hist = infra.forecast.history.slice(-24).map((m) => ({ month: m.month, actual: m.energyKwh }));
    const last = hist[hist.length - 1];
    // Join the forecast to the last actual month so the dashed line is continuous.
    return [
      ...hist.slice(0, -1),
      { ...last, forecast: last.actual },
      ...infra.forecast.forecast.map((m) => ({ month: m.month, forecast: m.energyKwh })),
    ];
  }, [infra]);
  const toAdd = infra?.zips.filter((z) => z.addPorts > 0) ?? [];
  const peak = infra?.networkPeak;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Installed Capacity"
          value={peak ? formatNumber(peak.installedKw) : "—"}
          unit="kW"
          badge="synthetic"
          loading={!peak}
          hint="Rated power of all active ports."
        />
        <KpiCard
          label="Network Peak Load"
          value={peak ? formatNumber(peak.peakKw12m) : "—"}
          unit="kW"
          loading={!peak}
          hint={
            peak
              ? `Highest 15-minute load in the last 12 months, ${Math.round((100 * peak.peakKw12m) / peak.installedKw)}% of installed capacity.`
              : undefined
          }
        />
        <KpiCard
          label="Demand Growth"
          value={infra ? `${infra.forecast.growthPct >= 0 ? "+" : ""}${infra.forecast.growthPct.toFixed(0)}%` : "—"}
          accent
          loading={!infra}
          hint="Energy delivered, last 12 months vs the 12 months before."
        />
        <KpiCard
          label="Ports to Add"
          value={infra ? toAdd.reduce((a, z) => a + z.addPorts, 0) : "—"}
          badge="model"
          loading={!infra}
          hint={`To keep every area at or below ${target}% occupancy next year.`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* MCDA ranking */}
        <Card>
          <CardHeader
            title="MCDA Ranking"
            subtitle="Weighted multi-criteria score per area (ZIP), 0–100"
            action={<DataBadge label="model" />}
          />
          {infra ? (
            <>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mcda} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                    <YAxis type="category" dataKey="zip" tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} />
                    <Tooltip
                      formatter={(v: number, name: string) => [`${v.toFixed(1)} pts`, name]}
                      contentStyle={TOOLTIP_STYLE}
                      labelStyle={TOOLTIP_LABEL}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    {CRITERIA.map((c) => (
                      <Bar key={c.key} dataKey={c.key} name={c.label} stackId="s" fill={c.color} isAnimationActive={false} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Weights:{" "}
                {CRITERIA.map((c) => `${c.label.toLowerCase()} ${Math.round(infra.weights[c.key] * 100)}%`).join(", ")}.
                Each criterion is scaled 0–1 across the five areas, over {infra.window.from} to {infra.window.to}. A
                stand-in until the Python MCDA engine is available.
              </p>
            </>
          ) : (
            <Skeleton className="h-60 w-full rounded-lg" />
          )}
        </Card>

        {/* Coverage gap analysis */}
        <Card>
          <CardHeader
            title="Coverage Gap Analysis"
            subtitle={`Port occupancy per area, now and projected next year, vs the ${target}% planning target`}
            action={<DataBadge label="model" />}
          />
          {infra ? (
            <>
              <ul className="space-y-4">
                {coverage.map((z) => {
                  const gap = z.projected > target;
                  return (
                    <li key={z.zip}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium text-navy-800">
                          {z.zip}{" "}
                          <span className="text-xs font-normal text-slate-400">
                            {z.ports} ports · {formatNumber(z.sessions12m / z.ports)} sessions/port
                          </span>
                        </span>
                        <span className={`text-xs font-semibold ${gap ? "text-rose-600" : "text-slate-500"}`}>
                          {pct(z.occupancyPct)} → {pct(z.projected)}
                          {gap && " · gap"}
                        </span>
                      </div>
                      <div className="relative h-2.5 rounded-full bg-slate-100">
                        <div
                          className={`absolute h-2.5 rounded-full ${gap ? "bg-rose-200" : "bg-slate-200"}`}
                          style={{ width: `${(100 * z.projected) / maxOcc}%` }}
                        />
                        <div
                          className="absolute h-2.5 rounded-full bg-[#2a78d6]"
                          style={{ width: `${(100 * z.occupancyPct) / maxOcc}%` }}
                        />
                        <div
                          className="absolute -top-1 h-4.5 w-0.5 bg-navy-800"
                          style={{ left: `${(100 * target) / maxOcc}%` }}
                          title={`${target}% target`}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-xs text-slate-400">
                Occupancy = plugged-in hours / installed port-hours, last 12 months (dark bar). The light bar
                adds the area's session growth (capped at +100%); the black tick is the {target}% target. Covers
                the city's own network only.
              </p>
            </>
          ) : (
            <Skeleton className="h-60 w-full rounded-lg" />
          )}
        </Card>
      </div>

      {/* Priority score table */}
      <Card>
        <CardHeader
          title="Priority Score Table"
          subtitle="Active stations ranked by the same MCDA criteria, first in line for added capacity"
          action={<DataBadge label="model" />}
        />
        {infra ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-100 text-xs text-navy-700">
                  <tr>
                    <th className="py-2 pr-4 font-semibold">#</th>
                    <th className="py-2 pr-4 font-semibold">Station</th>
                    <th className="py-2 pr-4 font-semibold">ZIP</th>
                    <th className="py-2 pr-4 text-right font-semibold">Ports</th>
                    <th className="py-2 pr-4 text-right font-semibold">Occupancy</th>
                    <th className="py-2 pr-4 text-right font-semibold">Growth</th>
                    <th className="py-2 pr-4 text-right font-semibold">Peak / Capacity</th>
                    <th className="py-2 pr-4 text-right font-semibold">Uptime</th>
                    <th className="py-2 text-right font-semibold">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {infra.stations.slice(0, PRIORITY_ROWS).map((s, i) => (
                    <tr key={s.siteId} className="border-b border-slate-50">
                      <td className="py-2.5 pr-4 text-slate-400">{i + 1}</td>
                      <td className="py-2.5 pr-4 font-medium text-navy-800">{names.get(s.siteId) ?? s.siteId}</td>
                      <td className="py-2.5 pr-4 text-slate-600">{s.zip}</td>
                      <td className="py-2.5 pr-4 text-right text-slate-600">{s.ports}</td>
                      <td className="py-2.5 pr-4 text-right text-slate-600">{pct(s.occupancyPct)}</td>
                      <td className="py-2.5 pr-4 text-right text-slate-600">{growth(s.growthPct)}</td>
                      <td className="py-2.5 pr-4 text-right text-slate-600">{pct(s.peakLoadPct, 0)}</td>
                      <td className="py-2.5 pr-4 text-right text-slate-600">{pct(s.uptimePct, 2)}</td>
                      <td className="py-2.5 text-right font-semibold text-navy-800">{s.score.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Top {PRIORITY_ROWS} of {infra.stations.length} active stations. Growth shows "new" when the station
              had fewer than 50 sessions the year before. Port ratings and uptime are synthetic.
            </p>
          </>
        ) : (
          <Skeleton className="h-64 w-full rounded-lg" />
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Short-term demand forecast */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Short-Term Demand Forecast"
            subtitle="Monthly energy delivered, last 24 months and the next 6"
            action={<DataBadge label="forecast" />}
          />
          {infra ? (
            <>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={demand} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickFormatter={monthLabel}
                      tick={AXIS_TICK}
                      tickLine={false}
                      axisLine={{ stroke: "#e2e8f0" }}
                      minTickGap={24}
                    />
                    <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} tickFormatter={compact} />
                    <Tooltip
                      labelFormatter={monthLabel}
                      formatter={(v: number, name: string) => [`${formatNumber(v)} kWh`, name]}
                      contentStyle={TOOLTIP_STYLE}
                      labelStyle={TOOLTIP_LABEL}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Area dataKey="actual" name="Actual" stroke="#2a78d6" fill="#2a78d6" fillOpacity={0.12} strokeWidth={2} isAnimationActive={false} />
                    <Line dataKey="forecast" name="Forecast" stroke="#2a78d6" strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Each forecast month is the same month last year scaled by the last 12 months' growth (
                {infra.forecast.growthPct >= 0 ? "+" : ""}
                {infra.forecast.growthPct.toFixed(0)}%). A planning guide, not a precise prediction.
              </p>
            </>
          ) : (
            <Skeleton className="h-60 w-full rounded-lg" />
          )}
        </Card>

        {/* Projected demand per area */}
        <Card>
          <CardHeader title="Next 6 Months by Area" subtitle="Projected energy vs the same months last year" action={<DataBadge label="forecast" />} />
          {infra ? (
            <ul className="space-y-3">
              {[...infra.forecast.byZip]
                .sort((a, b) => b.next6mKwh - a.next6mKwh)
                .map((z) => (
                  <li key={z.zip} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-navy-800">{z.zip}</span>
                    <span className="text-slate-600">
                      {formatNumber(z.next6mKwh)} kWh{" "}
                      <span className="text-xs font-medium text-brand-600">
                        {z.growthPct >= 0 ? "+" : ""}
                        {z.growthPct.toFixed(0)}%
                      </span>
                    </span>
                  </li>
                ))}
            </ul>
          ) : (
            <Skeleton className="h-60 w-full rounded-lg" />
          )}
        </Card>
      </div>

      {/* Expansion recommendations */}
      <Card>
        <CardHeader
          title="Expansion Recommendations"
          subtitle="Where to add ports next, ranked by MCDA score"
          action={<DataBadge label="model" />}
        />
        {infra ? (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {toAdd.map((z) => (
                <div key={z.zip} className="rounded-lg border border-brand-100 bg-brand-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-navy-800">ZIP {z.zip}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                      <TrendingUp className="h-3 w-3" />+{z.addPorts} ports
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {z.ports} ports at {pct(z.occupancyPct)} occupancy, sessions {growth(z.growthPct)} year on year,
                    peak at {pct(z.peakLoadPct, 0)} of capacity. MCDA score {z.score.toFixed(1)}.
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Ports to add = ports needed to hold next year's plugged-in hours at {target}% occupancy, minus the
              ports in place now. Other areas stay under the target with their current ports.
            </p>
          </>
        ) : (
          <Skeleton className="h-32 w-full rounded-lg" />
        )}
      </Card>
    </div>
  );
}
