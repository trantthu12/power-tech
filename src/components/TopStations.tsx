import { Card, CardHeader } from "./ui/Card";
import { useTopStations } from "@/lib/queries";
import { formatNumber } from "@/lib/format";

export function TopStations() {
  const { data } = useTopStations(5);
  const rows = data ?? [];
  const max = rows.reduce((m, r) => Math.max(m, r.energyKwh), 0) || 1;

  return (
    <Card>
      <CardHeader title="Top Stations" subtitle="By energy delivered (all-time)" />
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.name}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-slate-600" title={r.name}>
                {r.name}
              </span>
              <span className="shrink-0 font-medium text-navy-800">
                {formatNumber(r.energyKwh)} kWh
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${(r.energyKwh / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
