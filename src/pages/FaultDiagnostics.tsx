import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { DataBadge } from "@/components/ui/DataBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  AXIS_TICK,
  CATEGORY_COLORS,
  GRID_STROKE,
  TOOLTIP_LABEL,
  TOOLTIP_STYLE,
  monthLabel,
} from "@/components/ops/chart-style";
import { useOpsData, useSites } from "@/lib/queries";
import { reliability12m } from "@/services/ops";
import type { OpsData } from "@/services/ops";
import { formatNumber } from "@/lib/format";

const TELEMETRY_LABELS: Record<string, string> = {
  connector_warnings: "connector",
  trip_events: "trip",
  auth_failures: "auth",
  comm_dropouts: "comm",
};

/** Ports shown in the alert table. */
const ALERT_ROWS = 12;

function portLabel(portId: string): string {
  return portId.slice(portId.lastIndexOf("-") + 1);
}

/** Monthly failure counts per repair category, for the stacked history chart. */
function faultHistory(ops: OpsData) {
  const categories = Object.keys(CATEGORY_COLORS);
  const rows = new Map<string, Record<string, number | string>>();
  for (const m of ops.reliability) {
    rows.set(m.month, { month: m.month, ...Object.fromEntries(categories.map((c) => [c, 0])) });
  }
  for (const e of ops.events) {
    const row = rows.get(e.start.slice(0, 7));
    if (row) row[e.category] = (row[e.category] as number) + 1;
  }
  return { categories, rows: [...rows.values()] };
}

/** Rolling mean over `n` points, skipping missing values. */
function rolling(values: (number | null)[], n: number): (number | null)[] {
  return values.map((_, i) => {
    const w = values.slice(Math.max(0, i - n + 1), i + 1).filter((v): v is number => v != null);
    return w.length ? Math.round(w.reduce((a, v) => a + v, 0) / w.length) : null;
  });
}

export function FaultDiagnostics() {
  const { data: ops } = useOpsData();
  const { data: sites } = useSites();
  const names = useMemo(() => new Map(sites?.map((s) => [s.id, s.name])), [sites]);

  const r12 = ops ? reliability12m(ops) : null;
  const risk = ops?.risk;
  const alerts = risk?.ports.filter((p) => p.alert) ?? [];
  const history = useMemo(() => (ops ? faultHistory(ops) : null), [ops]);
  const trend = useMemo(() => {
    if (!ops) return [];
    const mtbf = rolling(ops.reliability.map((m) => m.mtbfH), 3);
    const mttr = rolling(ops.reliability.map((m) => m.mttrH), 3);
    return ops.reliability.map((m, i) => ({ month: m.month, mtbf: mtbf[i], mttr: mttr[i] }));
  }, [ops]);
  const probBins = useMemo(() => {
    if (!risk) return [];
    const edges = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1];
    return edges.slice(0, -1).map((lo, i) => ({
      bin: `${Math.round(lo * 100)}–${Math.round(edges[i + 1] * 100)}%`,
      ports: risk.ports.filter((p) => p.probability >= lo && p.probability < edges[i + 1]).length,
    }));
  }, [risk]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Network Uptime"
          value={r12 ? `${r12.uptimePct.toFixed(2)}%` : "—"}
          badge="synthetic"
          loading={!r12}
          hint="Last 12 months: 1 − downtime / installed port-hours."
        />
        <KpiCard
          label="MTBF"
          value={r12 ? formatNumber(r12.mtbfH) : "—"}
          unit="h"
          badge="synthetic"
          loading={!r12}
          hint="Mean time between failures per port, last 12 months."
        />
        <KpiCard
          label="MTTR"
          value={r12 ? r12.mttrH.toFixed(1) : "—"}
          unit="h"
          badge="synthetic"
          loading={!r12}
          hint="Mean time to repair a failure, last 12 months."
        />
        <KpiCard
          label="Ports on Alert"
          value={risk ? `${alerts.length} / ${risk.ports.length}` : "—"}
          badge="model"
          loading={!risk}
          hint={`Active ports whose ${risk?.model.horizonDays ?? 7}-day fault probability is above the FR-02 threshold.`}
        />
        <KpiCard
          label="Maintenance Cost"
          value={r12 ? `$${formatNumber(r12.costUsd)}` : "—"}
          badge="synthetic"
          loading={!r12}
          hint="Labour and parts for all maintenance events, last 12 months."
        />
      </div>

      {/* Risk-ranked alert table */}
      <Card>
        <CardHeader
          title="Risk-Ranked Alerts"
          subtitle={`Active ports ranked by ${risk?.model.horizonDays ?? 7}-day fault probability, as of ${ops?.meta.dateEnd ?? "—"}`}
          action={<DataBadge label="model · synthetic" />}
        />
        {risk ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-slate-100 text-xs text-navy-700">
                  <tr>
                    <th className="py-2 pr-4 font-semibold">Station</th>
                    <th className="py-2 pr-4 font-semibold">Port</th>
                    <th className="py-2 pr-4 font-semibold">Fault Probability</th>
                    <th className="py-2 pr-4 text-right font-semibold">Failures (365d)</th>
                    <th className="py-2 pr-4 text-right font-semibold">Last Failure</th>
                    <th className="py-2 pr-4 font-semibold">Telemetry (7d)</th>
                    <th className="py-2 font-semibold">Main Drivers</th>
                  </tr>
                </thead>
                <tbody>
                  {risk.ports.slice(0, ALERT_ROWS).map((p) => {
                    const signals = Object.entries(p.telemetry7d).filter(([, n]) => n > 0);
                    return (
                      <tr key={p.portId} className="border-b border-slate-50 align-top">
                        <td className="py-2.5 pr-4 font-medium text-navy-800">
                          {names.get(p.siteId) ?? p.siteId}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-600">{portLabel(p.portId)}</td>
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 rounded-full bg-slate-100">
                              <div
                                className={`h-1.5 rounded-full ${p.alert ? "bg-rose-500" : "bg-slate-300"}`}
                                style={{ width: `${Math.round(p.probability * 100)}%` }}
                              />
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 font-medium ${
                                p.alert ? "text-rose-600" : "text-slate-500"
                              }`}
                            >
                              {p.alert && <AlertTriangle className="h-3 w-3" />}
                              {Math.round(p.probability * 100)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 text-right text-slate-600">{p.failures365d}</td>
                        <td className="py-2.5 pr-4 text-right text-slate-600">
                          {p.daysSinceLastFailure == null ? "none" : `${p.daysSinceLastFailure}d ago`}
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-slate-500">
                          {signals.length
                            ? signals.map(([k, n]) => `${n} ${TELEMETRY_LABELS[k]}`).join(", ")
                            : "quiet"}
                        </td>
                        <td className="py-2.5 text-xs text-slate-500">{p.topFactors.join(", ")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Top {ALERT_ROWS} of {risk.ports.length} active ports. Red = above the alert threshold (
              {Math.round(risk.model.threshold * 100)}%). Main drivers are the features that pushed
              this port's score up most. Telemetry and failure history are synthetic.
            </p>
          </>
        ) : (
          <Skeleton className="h-64 w-full rounded-lg" />
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Fault probability: model card + distribution */}
        <Card>
          <CardHeader
            title="Fault Probability"
            subtitle={`${risk?.model.name ?? "FR-02"} · next ${risk?.model.horizonDays ?? 7} days, all active ports`}
            action={<DataBadge label="model · synthetic" />}
          />
          {risk ? (
            <>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={probBins} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                    <XAxis dataKey="bin" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} interval={0} fontSize={10} />
                    <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                    <Tooltip
                      formatter={(v: number) => [`${v} ports`, ""]}
                      contentStyle={TOOLTIP_STYLE}
                      labelStyle={TOOLTIP_LABEL}
                    />
                    <Bar dataKey="ports" isAnimationActive={false} radius={[3, 3, 0, 0]} fill="#2a78d6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["ROC-AUC", risk.model.test.rocAuc.toFixed(2), "target ≥ 0.80"],
                  ["Precision", `${Math.round(risk.model.test.precision * 100)}%`, "target ≥ 30%"],
                  ["Recall", `${Math.round(risk.model.test.recall * 100)}%`, "target ≥ 70%"],
                  ["Threshold", `${Math.round(risk.model.threshold * 100)}%`, `set on ${risk.model.thresholdSetOn.split(" ")[0]}`],
                ].map(([k, v, note]) => (
                  <div key={k} className="rounded-lg bg-slate-50 px-3 py-2">
                    <dt className="text-[11px] text-slate-400">{k}</dt>
                    <dd className="text-base font-semibold text-navy-800">{v}</dd>
                    <dd className="text-[10px] text-slate-400">{note}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-slate-400">
                Trained on {risk.model.trainedOn}, tested on {risk.model.testedOn}. On the test years
                the model misses the FR-02 targets for ROC-AUC and precision: most alerts are false
                alarms, so treat the ranking as a triage order, not a prediction.
              </p>
            </>
          ) : (
            <Skeleton className="h-72 w-full rounded-lg" />
          )}
        </Card>

        {/* Fault history timeline */}
        <Card>
          <CardHeader
            title="Fault History"
            subtitle="Maintenance events per month, by repair category"
            action={<DataBadge />}
          />
          {history ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={history.rows} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={monthLabel}
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    minTickGap={24}
                  />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                  <Tooltip labelFormatter={monthLabel} contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  {history.categories.map((c) => (
                    <Bar key={c} dataKey={c} stackId="a" fill={CATEGORY_COLORS[c]} isAnimationActive={false} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Skeleton className="h-72 w-full rounded-lg" />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(
          [
            ["mtbf", "Mean Time Between Failures", "Hours per port between failures, 3-month rolling mean", "#008300"],
            ["mttr", "Mean Time To Repair", "Hours to repair a failure, 3-month rolling mean", "#eb6834"],
          ] as const
        ).map(([key, title, subtitle, color]) => (
          <Card key={key}>
            <CardHeader title={title} subtitle={subtitle} action={<DataBadge />} />
            {ops ? (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickFormatter={monthLabel}
                      tick={AXIS_TICK}
                      tickLine={false}
                      axisLine={{ stroke: "#e2e8f0" }}
                      minTickGap={24}
                    />
                    <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} />
                    <Tooltip
                      labelFormatter={monthLabel}
                      formatter={(v: number) => [`${formatNumber(v)} h`, ""]}
                      contentStyle={TOOLTIP_STYLE}
                      labelStyle={TOOLTIP_LABEL}
                    />
                    <Line
                      type="monotone"
                      dataKey={key}
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Skeleton className="h-56 w-full rounded-lg" />
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
