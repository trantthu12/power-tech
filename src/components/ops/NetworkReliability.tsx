// Reliability summary cards for Network Overview. They read the same
// operations data as Fault Diagnostics, which holds the full detail.
import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { AXIS_TICK, CATEGORY_COLORS, GRID_STROKE, TOOLTIP_LABEL, TOOLTIP_STYLE, monthLabel } from "./chart-style";
import { useOpsData, useSites } from "@/lib/queries";
import { reliability12m } from "@/services/ops";
import { formatNumber } from "@/lib/format";

/** Months of uptime history in the chart. */
const UPTIME_MONTHS = 24;
/** Rows in each ranked list. */
const TOP_FAULTS = 5;
const TOP_RISK = 3;
const LOWEST_UPTIME = 3;

/** "ConnectorLockFailure" -> "Connector lock failure", "EVCommunicationError" -> "EV communication error" */
function faultLabel(code: string): string {
  const words = (code.match(/[A-Z]+(?![a-z])|[A-Z][a-z]*/g) ?? [code]).map((w) =>
    w.length > 1 && w === w.toUpperCase() ? w : w.toLowerCase(),
  );
  const text = words.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function useStationNames() {
  const { data: sites } = useSites();
  return useMemo(() => new Map(sites?.map((s) => [s.id, s.name])), [sites]);
}

function DetailLink() {
  // Stay under /vodap when the page was opened there, as the sidebar does.
  const { pathname } = useLocation();
  const vodap = pathname === "/vodap" || pathname.startsWith("/vodap/");
  return (
    <Link
      to={vodap ? "/vodap/faults" : "/faults"}
      className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
    >
      Open Fault Diagnostics <ArrowRight className="h-3 w-3" />
    </Link>
  );
}

export function UptimeCard() {
  const { data: ops } = useOpsData();
  const names = useStationNames();
  const r12 = ops ? reliability12m(ops) : null;
  const months = ops?.reliability.slice(-UPTIME_MONTHS) ?? [];
  const downtimeH = ops?.reliability.slice(-12).reduce((a, m) => a + m.downtimeH, 0) ?? 0;
  const lowest =
    ops?.infrastructure.matrix.stations
      .filter((s) => s.active && s.components.uptime.value != null)
      .sort((a, b) => a.components.uptime.value! - b.components.uptime.value!)
      .slice(0, LOWEST_UPTIME) ?? [];

  return (
    <Card>
      <CardHeader
        title="Uptime / Downtime"
        subtitle={`Share of port-hours in service per month, last ${UPTIME_MONTHS} months`}
        action={<DataBadge label="synthetic" />}
      />
      {ops && r12 ? (
        <>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <p className="text-3xl font-bold tracking-tight text-navy-900">{r12.uptimePct.toFixed(2)}%</p>
            <p className="text-sm text-slate-500">
              last 12 months · {formatNumber(Math.round(downtimeH))} h downtime ·{" "}
              {formatNumber(r12.failedVisits)} failed visits
            </p>
          </div>
          <div className="mt-3 h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={months} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis
                  dataKey="month"
                  tickFormatter={monthLabel}
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  minTickGap={24}
                />
                <YAxis
                  domain={[97, 100]}
                  ticks={[97, 98, 99, 100]}
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  tickFormatter={(v: number) => `${v}%`}
                  allowDataOverflow
                />
                <Tooltip
                  labelFormatter={monthLabel}
                  formatter={(v: number) => [`${v.toFixed(2)}%`, "Uptime"]}
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={TOOLTIP_LABEL}
                />
                <Area
                  dataKey="uptimePct"
                  stroke="#2a78d6"
                  fill="#2a78d6"
                  fillOpacity={0.12}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-4 mb-2 text-xs font-semibold text-navy-700">Lowest uptime stations</p>
          <ul className="space-y-2">
            {lowest.map((s) => (
              <li key={s.siteId} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-navy-800">{names.get(s.siteId) ?? s.siteId}</span>
                <span className="shrink-0 font-semibold text-rose-600">
                  {s.components.uptime.value!.toFixed(2)}%
                </span>
              </li>
            ))}
          </ul>
          <DetailLink />
        </>
      ) : (
        <Skeleton className="h-72 w-full rounded-lg" />
      )}
    </Card>
  );
}

export function FaultsCard() {
  const { data: ops } = useOpsData();
  const names = useStationNames();

  const faults = useMemo(() => {
    if (!ops) return [];
    const from = ops.reliability.slice(-12)[0].month;
    const counts = new Map<string, { code: string; category: string; n: number }>();
    for (const e of ops.events) {
      if (!e.failure || e.start.slice(0, 7) < from) continue;
      const c = counts.get(e.code) ?? { code: e.code, category: e.category, n: 0 };
      c.n += 1;
      counts.set(e.code, c);
    }
    return [...counts.values()].sort((a, b) => b.n - a.n).slice(0, TOP_FAULTS);
  }, [ops]);
  const max = faults[0]?.n ?? 1;
  const risk = ops?.risk;
  const alerts = risk?.ports.filter((p) => p.alert).length ?? 0;
  const top = risk?.ports.slice(0, TOP_RISK) ?? [];

  return (
    <Card>
      <CardHeader
        title="Faults & Alerts"
        subtitle="Most common faults, last 12 months, and the ports most likely to fail next"
        action={<DataBadge label="model · synthetic" />}
      />
      {ops && risk ? (
        <>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <p className="text-3xl font-bold tracking-tight text-navy-900">
              {alerts} <span className="text-base font-medium text-slate-400">/ {risk.ports.length}</span>
            </p>
            <p className="text-sm text-slate-500">active ports on alert ({risk.model.horizonDays}-day fault risk)</p>
          </div>

          <p className="mt-4 mb-2 text-xs font-semibold text-navy-700">Top {TOP_FAULTS} faults</p>
          <ul className="space-y-2.5">
            {faults.map((f) => (
              <li key={f.code}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="text-navy-800">
                    {faultLabel(f.code)} <span className="text-xs text-slate-400">{f.category}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-navy-800">{f.n}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100">
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${(100 * f.n) / max}%`, background: CATEGORY_COLORS[f.category] ?? "#94a3b8" }}
                  />
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-4 mb-2 text-xs font-semibold text-navy-700">Highest fault risk</p>
          <ul className="space-y-2">
            {top.map((p) => (
              <li key={p.portId} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-navy-800">
                  {names.get(p.siteId) ?? p.siteId}{" "}
                  <span className="text-xs text-slate-400">{p.portId.split("-").pop()}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-rose-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {Math.round(p.probability * 100)}%
                </span>
              </li>
            ))}
          </ul>
          <DetailLink />
        </>
      ) : (
        <Skeleton className="h-72 w-full rounded-lg" />
      )}
    </Card>
  );
}
