import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
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
import type { DiComponent, MatrixStation, Quadrant, RiComponent } from "@/services/ops";
import { formatNumber } from "@/lib/format";

const QUADRANTS: Record<
  Quadrant,
  { n: string; label: string; color: string; badge: string; condition: string; action: string }
> = {
  expand: {
    n: "I",
    label: "Expand",
    color: "#1baf7a",
    badge: "bg-emerald-50 text-emerald-700",
    condition: "Busy and reliable, running out of capacity.",
    action: "Add ports or upgrade the transformer.",
  },
  refurbish: {
    n: "II",
    label: "Refurbish",
    color: "#eda100",
    badge: "bg-amber-50 text-amber-700",
    condition: "Busy, but held back by faults and downtime.",
    action: "Send field service, overhaul or replace hardware.",
  },
  decommission: {
    n: "III",
    label: "Decommission / Review",
    color: "#e5484d",
    badge: "bg-rose-50 text-rose-700",
    condition: "Unreliable and little used.",
    action: "Review for removal or move to a busier area.",
  },
  retain: {
    n: "IV",
    label: "Retain / Monitor",
    color: "#2a78d6",
    badge: "bg-sky-50 text-sky-700",
    condition: "Reliable, with spare capacity.",
    action: "Keep on the standard operating budget.",
  },
};
const QUADRANT_ORDER: Quadrant[] = ["expand", "refurbish", "decommission", "retain"];

const RI_PARTS: { key: RiComponent; label: string; fmt: (v: number) => string }[] = [
  { key: "uptime", label: "Uptime", fmt: (v) => `${v.toFixed(2)}%` },
  { key: "firstAttempt", label: "First-attempt success", fmt: (v) => `${v.toFixed(1)}%` },
  { key: "failures", label: "Failures / port / year", fmt: (v) => v.toFixed(1) },
  { key: "maintenanceCost", label: "Maintenance / port / year", fmt: (v) => `$${formatNumber(v)}` },
];
const DI_PARTS: { key: DiComponent; label: string; fmt: (v: number) => string }[] = [
  { key: "sessions", label: "Sessions / port / day", fmt: (v) => v.toFixed(2) },
  { key: "dwell", label: "Mean dwell", fmt: (v) => `${v.toFixed(1)} h` },
  { key: "occupancy", label: "Occupancy", fmt: (v) => `${v.toFixed(1)}%` },
  { key: "allBusy", label: "All ports busy", fmt: (v) => `${v.toFixed(1)}%` },
];

/** Matches ACTIVE_SINCE in scripts/export_ops_json.py. */
const INACTIVE_SINCE = "June 1, 2023";

type StatusFilter = "active" | "all";
type UseFilter = "all" | "public" | "fleet";

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={[
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === o.value ? "bg-white text-navy-800 shadow-sm" : "text-slate-500 hover:text-navy-700",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function QuadrantBadge({ q }: { q: Quadrant }) {
  const m = QUADRANTS[q];
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${m.badge}`}>
      {m.n} · {m.label}
    </span>
  );
}

export function InfrastructurePlanning() {
  const { data: ops } = useOpsData();
  const { data: sites } = useSites();
  const names = useMemo(() => new Map(sites?.map((s) => [s.id, s.name])), [sites]);
  const infra = ops?.infrastructure;
  const matrix = infra?.matrix;
  const mid = matrix?.midpoint ?? 50;
  const target = infra?.targetOccupancyPct ?? 20;

  const [status, setStatus] = useState<StatusFilter>("active");
  const [use, setUse] = useState<UseFilter>("all");
  const [hidden, setHidden] = useState<Set<Quadrant>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);

  // Stations matching the status and type filters; the quadrant chips only
  // narrow the matrix and the table.
  const inScope = useMemo(
    () =>
      matrix?.stations.filter((s) => (status === "all" || s.active) && (use === "all" || s.use === use)) ?? [],
    [matrix, status, use],
  );
  const shown = inScope.filter((s) => !hidden.has(s.quadrant));
  const counts = QUADRANT_ORDER.map((q) => [q, inScope.filter((s) => s.quadrant === q).length] as const);
  const expand = inScope.filter((s) => s.quadrant === "expand");
  const toAdd = expand.filter((s) => s.addPorts > 0).sort((a, b) => b.addPorts - a.addPorts);
  const detail = inScope.find((s) => s.siteId === selected) ?? null;
  const nameOf = (id: string) => names.get(id) ?? id;

  const toggleQuadrant = (q: Quadrant) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(q)) next.delete(q);
      else next.add(q);
      return next;
    });

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
  const peak = infra?.networkPeak;
  const allExpand = matrix?.stations.filter((s) => s.quadrant === "expand") ?? [];

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
          value={matrix ? allExpand.reduce((a, s) => a + s.addPorts, 0) : "—"}
          badge="model"
          loading={!matrix}
          hint={`At the ${allExpand.length} Expand stations, to bring each to ${target}% occupancy next year.`}
        />
      </div>

      {/* Station action matrix */}
      <Card>
        <CardHeader
          title="Station Action Matrix"
          subtitle="Each station by Demand Pressure (Di) and Reliability (Ri), last 12 months, split at 50"
          action={
            <div className="flex items-center gap-1.5">
              <DataBadge label="model" />
              <DataBadge label="synthetic" />
            </div>
          }
        />
        {matrix && infra ? (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Segmented
                value={status}
                onChange={setStatus}
                options={[
                  { value: "active", label: "Excluding Inactive Stations" },
                  { value: "all", label: "Include Inactive Stations" },
                ]}
              />
              <Segmented
                value={use}
                onChange={setUse}
                options={[
                  { value: "all", label: "All" },
                  { value: "public", label: "Public" },
                  { value: "fleet", label: "Fleet" },
                ]}
              />
              <p className="basis-full text-xs text-slate-400">
                Public: open to any driver. Fleet: for City of Boulder fleet vehicles, which often stay plugged
                in overnight. Inactive: no session since {INACTIVE_SINCE}.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="h-[420px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 8, right: 16, bottom: 16, left: 0 }}>
                      <ReferenceArea x1={mid} x2={100} y1={mid} y2={100} fill={QUADRANTS.expand.color} fillOpacity={0.05} />
                      <ReferenceArea x1={mid} x2={100} y1={0} y2={mid} fill={QUADRANTS.refurbish.color} fillOpacity={0.05} />
                      <ReferenceArea x1={0} x2={mid} y1={0} y2={mid} fill={QUADRANTS.decommission.color} fillOpacity={0.05} />
                      <ReferenceArea x1={0} x2={mid} y1={mid} y2={100} fill={QUADRANTS.retain.color} fillOpacity={0.05} />
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                      <XAxis
                        type="number"
                        dataKey="di"
                        name="Di"
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        tick={AXIS_TICK}
                        tickLine={false}
                        axisLine={{ stroke: "#e2e8f0" }}
                        label={{ value: "Demand Pressure Index (Di)", position: "insideBottom", offset: -8, fontSize: 11, fill: "#64748b" }}
                      />
                      <YAxis
                        type="number"
                        dataKey="ri"
                        name="Ri"
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        tick={AXIS_TICK}
                        tickLine={false}
                        axisLine={false}
                        width={44}
                        label={{ value: "Reliability Index (Ri)", angle: -90, position: "insideLeft", offset: 12, fontSize: 11, fill: "#64748b" }}
                      />
                      <ReferenceLine x={mid} stroke="#94a3b8" strokeWidth={1.5} />
                      <ReferenceLine y={mid} stroke="#94a3b8" strokeWidth={1.5} />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        content={({ payload }) => {
                          const s = payload?.[0]?.payload as MatrixStation | undefined;
                          if (!s) return null;
                          return (
                            <div style={TOOLTIP_STYLE} className="bg-white px-3 py-2 shadow-sm">
                              <p style={TOOLTIP_LABEL}>{nameOf(s.siteId)}</p>
                              <p className="mt-0.5 text-slate-500">
                                Ri {s.ri.toFixed(1)} · Di {s.di.toFixed(1)} · {s.ports} {s.ports === 1 ? "port" : "ports"} · {s.use}
                                {!s.active && " · inactive"}
                              </p>
                              <p className="mt-1 font-medium" style={{ color: QUADRANTS[s.quadrant].color }}>
                                {QUADRANTS[s.quadrant].label}
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Scatter
                        data={shown}
                        isAnimationActive={false}
                        onClick={(p: { payload?: MatrixStation }) => p.payload && setSelected(p.payload.siteId)}
                        className="cursor-pointer"
                      >
                        {shown.map((s) => (
                          <Cell
                            key={s.siteId}
                            fill={QUADRANTS[s.quadrant].color}
                            fillOpacity={s.active ? 0.85 : 0.35}
                            stroke={s.siteId === selected ? "#1c2438" : "#fff"}
                            strokeWidth={s.siteId === selected ? 2 : 1}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-2.5">
                {counts.map(([q, n]) => {
                  const m = QUADRANTS[q];
                  const off = hidden.has(q);
                  return (
                    <button
                      key={q}
                      onClick={() => toggleQuadrant(q)}
                      aria-pressed={!off}
                      className={[
                        "w-full rounded-lg border p-3 text-left transition-opacity",
                        off ? "border-slate-100 opacity-40" : "border-slate-200 hover:border-slate-300",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-sm font-semibold text-navy-800">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
                          {m.n} · {m.label}
                        </span>
                        <span className="text-sm font-semibold text-navy-800">{n}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{m.condition}</p>
                      <p className="text-xs font-medium text-slate-600">{m.action}</p>
                    </button>
                  );
                })}
                <p className="text-xs text-slate-400">Click a quadrant to hide or show it.</p>
              </div>
            </div>

            {detail && (
              <div className="mt-5 rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-navy-800">
                    {nameOf(detail.siteId)}{" "}
                    <span className="text-xs font-normal text-slate-400">
                      ZIP {detail.zip} · {detail.ports} {detail.ports === 1 ? "port" : "ports"} · {detail.use}
                      {!detail.active && " · inactive"}
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    <QuadrantBadge q={detail.quadrant} />
                    <button onClick={() => setSelected(null)} className="text-xs text-slate-400 hover:text-navy-700">
                      Close
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {(
                    [
                      ["Reliability Index", detail.ri, RI_PARTS, matrix.weights.ri],
                      ["Demand Pressure Index", detail.di, DI_PARTS, matrix.weights.di],
                    ] as const
                  ).map(([title, total, parts, weights]) => (
                    <div key={title}>
                      <p className="mb-2 text-xs font-semibold text-navy-700">
                        {title}: {total.toFixed(1)}
                      </p>
                      <table className="w-full text-xs">
                        <tbody>
                          {parts.map((p) => {
                            const c = detail.components[p.key];
                            const w = (weights as Record<string, number>)[p.key];
                            return (
                              <tr key={p.key} className="border-b border-slate-50">
                                <td className="py-1.5 pr-2 text-slate-600">
                                  {p.label} <span className="text-slate-400">({Math.round(w * 100)}%)</span>
                                </td>
                                <td className="py-1.5 pr-2 text-right text-slate-600">
                                  {c.value == null ? "no data" : p.fmt(c.value)}
                                </td>
                                <td className="w-10 py-1.5 text-right font-semibold text-navy-800">
                                  {c.score == null ? "—" : c.score.toFixed(0)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-100 text-xs text-navy-700">
                  <tr>
                    <th className="py-2 pr-4 font-semibold">Station</th>
                    <th className="py-2 pr-4 font-semibold">ZIP</th>
                    <th className="py-2 pr-4 font-semibold">Type</th>
                    <th className="py-2 pr-4 text-right font-semibold">Ports</th>
                    <th className="py-2 pr-4 text-right font-semibold">Ri</th>
                    <th className="py-2 pr-4 text-right font-semibold">Di</th>
                    <th className="py-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((s) => (
                    <tr
                      key={s.siteId}
                      onClick={() => setSelected(s.siteId)}
                      className={[
                        "cursor-pointer border-b border-slate-50 hover:bg-slate-50",
                        s.siteId === selected ? "bg-slate-50" : "",
                      ].join(" ")}
                    >
                      <td className="py-2.5 pr-4 font-medium text-navy-800">
                        {nameOf(s.siteId)}
                        {!s.active && <span className="ml-2 text-xs font-normal text-slate-400">inactive</span>}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-600">{s.zip}</td>
                      <td className="py-2.5 pr-4 capitalize text-slate-600">{s.use}</td>
                      <td className="py-2.5 pr-4 text-right text-slate-600">{s.ports}</td>
                      <td className="py-2.5 pr-4 text-right text-slate-600">{s.ri.toFixed(1)}</td>
                      <td className="py-2.5 pr-4 text-right text-slate-600">{s.di.toFixed(1)}</td>
                      <td className="py-2.5">
                        <QuadrantBadge q={s.quadrant} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              {shown.length} of {inScope.length} stations, sorted by Di. Each index is the weighted mean of four
              components scored 0–100 against fixed anchors (for example, uptime {matrix.anchors.uptime[0]}% scores 0
              and {matrix.anchors.uptime[1]}% scores 100), over {infra.window.from} to {infra.window.to}. A score of
              exactly {mid} counts as high. Uptime, faults, maintenance and first-attempt success are synthetic; click
              a row or point for its breakdown.
            </p>
          </>
        ) : (
          <Skeleton className="h-[420px] w-full rounded-lg" />
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Short-term demand forecast */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Short-Term Demand Forecast"
            subtitle="Monthly network energy delivered, last 24 months and the next 6"
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

        {/* Projected demand at Expand stations */}
        <Card>
          <CardHeader
            title="Next 6 Months at Expand Stations"
            subtitle="Projected energy vs the same months last year"
            action={<DataBadge label="forecast" />}
          />
          {matrix ? (
            expand.length ? (
              <ul className="space-y-3">
                {[...expand]
                  .sort((a, b) => (b.forecast.next6mKwh ?? -1) - (a.forecast.next6mKwh ?? -1))
                  .map(({ siteId, forecast: f }) => (
                    <li key={siteId} className="text-sm">
                      <p className="font-medium text-navy-800">{nameOf(siteId)}</p>
                      {f.next6mKwh != null && f.growthPct != null ? (
                        <p className="text-slate-600">
                          {formatNumber(f.next6mKwh)} kWh{" "}
                          <span className="text-xs font-medium text-brand-600">
                            {f.growthPct >= 0 ? "+" : ""}
                            {f.growthPct.toFixed(0)}%
                          </span>
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400">Less than two years of data, no forecast</p>
                      )}
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No Expand stations match the filters.</p>
            )
          ) : (
            <Skeleton className="h-60 w-full rounded-lg" />
          )}
        </Card>
      </div>

      {/* Expansion recommendations */}
      <Card>
        <CardHeader
          title="Expansion Recommendations"
          subtitle="Ports to add at Expand stations (quadrant I) matching the filters above"
          action={<DataBadge label="model" />}
        />
        {matrix ? (
          <>
            {toAdd.length ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {toAdd.map((s) => (
                  <div key={s.siteId} className="rounded-lg border border-brand-100 bg-brand-50/50 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-navy-800">{nameOf(s.siteId)}</span>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                        <TrendingUp className="h-3 w-3" />+{s.addPorts} {s.addPorts === 1 ? "port" : "ports"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {s.ports} {s.ports === 1 ? "port" : "ports"} at {s.components.occupancy.value?.toFixed(1) ?? "—"}% occupancy, all ports busy{" "}
                      {s.components.allBusy.value?.toFixed(1) ?? "—"}% of the time, sessions{" "}
                      {s.growthPct == null ? "new" : `${s.growthPct >= 0 ? "+" : ""}${s.growthPct.toFixed(0)}%`} year on
                      year. Ri {s.ri.toFixed(0)}, Di {s.di.toFixed(0)}.
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No Expand stations match the filters.</p>
            )}
            <p className="mt-3 text-xs text-slate-400">
              Ports to add = ports needed to hold next year's plugged-in hours at {target}% occupancy, minus the ports
              in place now. Growth is capped at +100%.
            </p>
          </>
        ) : (
          <Skeleton className="h-32 w-full rounded-lg" />
        )}
      </Card>
    </div>
  );
}
