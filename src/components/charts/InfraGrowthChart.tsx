import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { GrowthPoint } from "@/types";

interface InfraGrowthChartProps {
  data: GrowthPoint[];
}

/** Cumulative public stations (area) with stations opened each year (bars). */
export function InfraGrowthChart({ data }: InfraGrowthChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="infraGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#008300" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#008300" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip
            formatter={(v: number, name: string) => [
              v,
              name === "cumulative" ? "Total stations" : "Opened that year",
            ]}
            labelFormatter={(y) => `Year ${y}`}
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
          />
          <Bar dataKey="opened" fill="#aeda72" radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="#008300"
            strokeWidth={2}
            fill="url(#infraGrad)"
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
