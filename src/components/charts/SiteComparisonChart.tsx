import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { SiteComparison } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/format";

interface SiteComparisonChartProps {
  data: SiteComparison[];
  metric: "energyKwh" | "revenue";
  limit?: number;
}

export function SiteComparisonChart({
  data,
  metric,
  limit = 8,
}: SiteComparisonChartProps) {
  const rows = [...data]
    .sort((a, b) => b[metric] - a[metric])
    .slice(0, limit)
    .map((r) => ({ name: r.name, value: r[metric] }));

  const color = metric === "energyKwh" ? "#7ac943" : "#3b4a6b";
  const fmt = metric === "energyKwh" ? formatNumber : formatCurrency;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              new Intl.NumberFormat("en-US", { notation: "compact" }).format(v)
            }
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            width={120}
          />
          <Tooltip
            formatter={(v: number) => [fmt(v), metric === "energyKwh" ? "Energy" : "Revenue"]}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false}>
            {rows.map((r) => (
              <Cell key={r.name} fill={color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
