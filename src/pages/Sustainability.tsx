import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { DataBadge } from "@/components/ui/DataBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { AXIS_TICK, GRID_STROKE, TOOLTIP_LABEL, TOOLTIP_STYLE, compact } from "@/components/ops/chart-style";
import { useOpsData, useSites } from "@/lib/queries";
import { reliability12m } from "@/services/ops";
import { formatNumber } from "@/lib/format";

// EPA Greenhouse Gas Equivalencies: a typical passenger vehicle emits about
// 4.6 t CO₂ a year; one tree seedling grown for 10 years absorbs about 0.060 t.
const T_CO2_PER_CAR_YEAR = 4.6;
const T_CO2_PER_TREE_10Y = 0.06;

/** Port-age buckets for the ageing chart, in years. */
const AGE_BUCKETS = [0, 2, 4, 6, 8, 10, 12];

export function Sustainability() {
  const { data: ops } = useOpsData();
  const { data: sites } = useSites();
  const names = useMemo(() => new Map(sites?.map((s) => [s.id, s.name])), [sites]);

  const yearly = ops?.sustainability.yearly ?? [];
  const total = yearly.reduce(
    (a, y) => ({
      energy: a.energy + y.energyKwh,
      co2: a.co2 + y.co2Kg,
      gas: a.gas + y.gasolineGal,
      sessions: a.sessions + y.sessions,
    }),
    { energy: 0, co2: 0, gas: 0, sessions: 0 }
  );
  // 2023 ends on Nov 30, so compare like-for-like on the last two full years.
  const [y21, y22] = yearly.filter((y) => y.year === 2021 || y.year === 2022);
  const co2Growth = y21 && y22 ? (100 * (y22.co2Kg - y21.co2Kg)) / y21.co2Kg : undefined;

  const active = ops?.ports.filter((p) => p.active) ?? [];
  const ageLimit = ops?.sustainability.ageingYears ?? 8;
  const ageing = active.filter((p) => p.ageYears >= ageLimit).sort((a, b) => b.ageYears - a.ageYears);
  const ageChart = AGE_BUCKETS.slice(0, -1).map((lo, i) => ({
    bucket: `${lo}–${AGE_BUCKETS[i + 1]}y`,
    ports: active.filter((p) => p.ageYears >= lo && p.ageYears < AGE_BUCKETS[i + 1]).length,
  }));

  const r12 = ops ? reliability12m(ops) : null;
  const last12 = ops?.infrastructure.forecast.history.slice(-12).reduce((a, m) => a + m.energyKwh, 0);
  const byUse = ops?.sustainability.byUse;
  const publicShare = byUse
    ? (100 * byUse.public.energyKwh) / (byUse.public.energyKwh + byUse.fleet.energyKwh)
    : undefined;
  const tCo2 = total.co2 / 1000;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Energy Delivered"
          value={ops ? formatNumber(total.energy / 1000) : "—"}
          unit="MWh"
          loading={!ops}
          hint="All sessions, Jan 2018 – Nov 2023."
        />
        <KpiCard
          label="CO₂ Avoided"
          value={ops ? formatNumber(tCo2) : "—"}
          unit="t"
          accent
          loading={!ops}
          deltaPct={co2Growth}
          hint="Versus equivalent gasoline cars. Change is 2022 vs 2021."
        />
        <KpiCard
          label="Gasoline Displaced"
          value={ops ? formatNumber(total.gas) : "—"}
          unit="gal"
          accent
          loading={!ops}
          hint="Fuel the same driving would have burned."
        />
        <KpiCard
          label="Ageing Ports"
          value={ops ? `${ageing.length} / ${active.length}` : "—"}
          badge="synthetic"
          loading={!ops}
          hint={`Active ports installed ${ageLimit}+ years ago.`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Energy delivered and avoided emissions */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Energy Delivered & Emissions Avoided"
            subtitle="Per year (2023 runs to Nov 30)"
          />
          {ops ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={yearly.map((y) => ({ year: y.year, mwh: y.energyKwh / 1000, t: y.co2Kg / 1000 }))}
                  margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="year" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                  <YAxis yAxisId="mwh" tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} tickFormatter={compact} />
                  <YAxis yAxisId="t" orientation="right" tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} tickFormatter={compact} />
                  <Tooltip
                    formatter={(v: number, name: string) => [
                      `${formatNumber(v)} ${name === "Energy" ? "MWh" : "t"}`,
                      name,
                    ]}
                    contentStyle={TOOLTIP_STYLE}
                    labelStyle={TOOLTIP_LABEL}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="mwh" dataKey="mwh" name="Energy" fill="#2a78d6" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  <Line yAxisId="t" dataKey="t" name="CO₂ avoided" stroke="#008300" strokeWidth={2} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Skeleton className="h-64 w-full rounded-lg" />
          )}
        </Card>

        {/* CO₂ offset estimate */}
        <Card>
          <CardHeader title="CO₂ Offset Estimate" subtitle="What the avoided emissions equal" action={<DataBadge label="estimate" />} />
          {ops ? (
            <>
              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-bold leading-none text-brand-600">
                    {formatNumber(tCo2)} <span className="text-sm font-normal text-slate-400">t CO₂</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-400">avoided since 2018</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                  <p className="text-lg font-semibold text-navy-800">
                    {formatNumber(tCo2 / T_CO2_PER_CAR_YEAR)} cars
                  </p>
                  <p className="text-xs text-slate-500">taken off the road for a year</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                  <p className="text-lg font-semibold text-navy-800">
                    {formatNumber(tCo2 / T_CO2_PER_TREE_10Y)} tree seedlings
                  </p>
                  <p className="text-xs text-slate-500">grown for 10 years</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Uses the US EPA equivalencies: {T_CO2_PER_CAR_YEAR} t CO₂ per passenger car per year,{" "}
                {T_CO2_PER_TREE_10Y} t per seedling over 10 years.
              </p>
            </>
          ) : (
            <Skeleton className="h-64 w-full rounded-lg" />
          )}
        </Card>
      </div>

      {/* ESG summary panel */}
      <Card>
        <CardHeader
          title="ESG Summary"
          subtitle={`Last 12 months (${r12 ? r12.from : "—"} to ${ops?.meta.dateEnd.slice(0, 7) ?? "—"})`}
        />
        {ops && r12 && last12 != null && publicShare != null ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {(
              [
                [
                  "Environmental",
                  [
                    ["Energy delivered", `${formatNumber(last12 / 1000)} MWh`, false],
                    ["CO₂ avoided, all time", `${formatNumber(tCo2)} t`, false],
                    ["Gasoline displaced, all time", `${formatNumber(total.gas)} gal`, false],
                  ],
                ],
                [
                  "Social",
                  [
                    ["Charging sessions, all time", formatNumber(total.sessions), false],
                    ["Energy on public chargers", `${publicShare.toFixed(1)}%`, false],
                    ["Visits that started first try", `${r12.firstAttemptPct.toFixed(1)}%`, true],
                  ],
                ],
                [
                  "Governance",
                  [
                    ["Network uptime", `${r12.uptimePct.toFixed(2)}%`, true],
                    ["Mean time to repair", `${r12.mttrH.toFixed(1)} h`, true],
                    ["Maintenance spend", `$${formatNumber(r12.costUsd)}`, true],
                  ],
                ],
              ] as const
            ).map(([pillar, rows]) => (
              <div key={pillar} className="rounded-lg border border-slate-100 p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700">{pillar}</h4>
                <dl className="space-y-2.5">
                  {rows.map(([k, v, synthetic]) => (
                    <div key={k} className="flex items-baseline justify-between gap-3 text-sm">
                      <dt className="text-slate-500">
                        {k}
                        {synthetic && <span className="ml-1 text-[10px] text-slate-400">(synthetic)</span>}
                      </dt>
                      <dd className="font-semibold text-navy-800">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        ) : (
          <Skeleton className="h-40 w-full rounded-lg" />
        )}
      </Card>

      {/* Ageing asset flags */}
      <Card>
        <CardHeader
          title="Ageing Asset Flags"
          subtitle={`Active ports installed ${ageLimit} or more years ago`}
          action={<DataBadge />}
        />
        {ops ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={ageChart} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="bucket" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [`${v} ports`, ""]} contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} />
                  <Bar dataKey="ports" fill="#eda100" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto lg:col-span-2">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="border-b border-slate-100 text-xs text-navy-700">
                  <tr>
                    <th className="py-2 pr-4 font-semibold">Station</th>
                    <th className="py-2 pr-4 font-semibold">Port</th>
                    <th className="py-2 pr-4 font-semibold">Installed</th>
                    <th className="py-2 pr-4 text-right font-semibold">Age</th>
                    <th className="py-2 text-right font-semibold">Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {ageing.map((p) => (
                    <tr key={p.id} className="border-b border-slate-50">
                      <td className="py-2.5 pr-4 font-medium text-navy-800">{names.get(p.siteId) ?? p.siteId}</td>
                      <td className="py-2.5 pr-4 text-slate-600">{p.id.slice(p.id.lastIndexOf("-") + 1)}</td>
                      <td className="py-2.5 pr-4 text-slate-600">{p.installDate}</td>
                      <td className="py-2.5 pr-4 text-right font-medium text-amber-600">{p.ageYears.toFixed(1)}y</td>
                      <td className="py-2.5 text-right text-slate-600">{formatNumber(p.sessions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <Skeleton className="h-52 w-full rounded-lg" />
        )}
        <p className="mt-3 text-xs text-slate-400">
          Level 2 chargers typically last about 10 years, so ports past {ageLimit} years are flagged for
          replacement planning. Install dates are synthetic.
        </p>
      </Card>
    </div>
  );
}
