import { Card, CardHeader } from "./ui/Card";
import { useEnergyByZip } from "@/lib/queries";
import { formatNumber } from "@/lib/format";
import { CATEGORICAL as COLORS } from "@/lib/colors";

export function EnergyByZip() {
  const { data } = useEnergyByZip();
  const rows = data ?? [];
  const max = rows.reduce((m, r) => Math.max(m, r.energyKwh), 0) || 1;

  return (
    <Card>
      <CardHeader
        title="Energy by Area (ZIP)"
        subtitle="Total kWh delivered per area, areas defined by ZIP code"
      />
      <ul className="space-y-3">
        {rows.map((r, i) => (
          <li key={r.zip}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 text-slate-600">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                {r.zip}
              </span>
              <span className="font-medium text-navy-800">
                {formatNumber(r.energyKwh)} kWh
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(r.energyKwh / max) * 100}%`,
                  backgroundColor: COLORS[i % COLORS.length],
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
