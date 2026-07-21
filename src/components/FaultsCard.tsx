import { useFaults, useNetworkKpis } from "@/lib/queries";
import type { FaultSeverity } from "@/types";

const SEVERITY_META: { key: FaultSeverity; label: string; color: string }[] = [
  { key: "critical", label: "Critical", color: "#e11d48" },
  { key: "high", label: "High", color: "#f97316" },
  { key: "medium", label: "Medium", color: "#f59e0b" },
  { key: "low", label: "Low", color: "#94a3b8" },
];

export function FaultsCard() {
  const { data: kpis } = useNetworkKpis();
  const { data: faults } = useFaults();

  // Break active (unresolved) faults down by severity.
  const active = (faults ?? []).filter((f) => f.status !== "resolved");
  const counts = SEVERITY_META.map((s) => ({
    ...s,
    count: active.filter((f) => f.severity === s.key).length,
  }));
  const total = active.length;

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="text-sm font-semibold text-navy-700">
        Faults &amp; Connectivity Loss
      </span>

      <div className="mt-3 flex items-baseline gap-3">
        <span className="text-3xl font-bold leading-none text-navy-800">
          {kpis ? kpis.faults : "—"}
        </span>
        <span className="text-xs text-slate-400">active faults</span>
      </div>

      <div className="mt-2 text-xs text-slate-500">
        Connectivity loss{" "}
        <span className="font-semibold text-navy-700">
          {kpis ? `${kpis.connectivityLossPct}%` : "—"}
        </span>
      </div>

      {/* Severity breakdown bar */}
      <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
        {total > 0 &&
          counts.map(
            (s) =>
              s.count > 0 && (
                <div
                  key={s.key}
                  style={{
                    width: `${(s.count / total) * 100}%`,
                    backgroundColor: s.color,
                  }}
                />
              )
          )}
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {counts.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="flex-1 text-slate-500">{s.label}</span>
            <span className="font-medium text-navy-800">{s.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
