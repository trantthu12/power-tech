import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardHeader } from "./ui/Card";
import { useConnectorBreakdown } from "@/lib/queries";
import { formatNumber } from "@/lib/format";
import { CONNECTOR_COLORS as COLORS } from "@/lib/colors";

export function ConnectorDonut() {
  const { data } = useConnectorBreakdown();
  const rows = data ?? [];
  const total = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <Card>
      <CardHeader title="Charging Stations Connector" simulated />
      <div className="flex items-center gap-4">
        <div className="h-32 w-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={rows}
                dataKey="count"
                nameKey="connector"
                innerRadius={42}
                outerRadius={60}
                paddingAngle={2}
              >
                {rows.map((r) => (
                  <Cell key={r.connector} fill={COLORS[r.connector] ?? "#cbd5e1"} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name) => [formatNumber(value), name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="min-w-0 flex-1 space-y-2 text-sm">
          {rows.map((r) => (
            <li key={r.connector} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: COLORS[r.connector] ?? "#cbd5e1" }}
              />
              <span className="flex-1 text-slate-600">{r.connector}</span>
              <span className="font-medium text-navy-800">
                {total > 0 ? Math.round((r.count / total) * 100) : 0}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
