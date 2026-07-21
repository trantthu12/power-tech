import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Granularity, TimeSeriesPoint } from "@/types";

interface TrendChartProps {
  data: TimeSeriesPoint[];
  granularity: Granularity;
  color?: string;
  valueFormatter?: (v: number) => string;
}

function labelFor(iso: string, g: Granularity): string {
  const d = new Date(iso.length === 7 ? `${iso}-01` : iso);
  if (g === "month") {
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TrendChart({
  data,
  granularity,
  color = "#7ac943",
  valueFormatter = (v) => String(v),
}: TrendChartProps) {
  const chartData = data.map((p) => ({
    label: labelFor(p.timestamp, granularity),
    value: p.value,
  }));
  const gradientId = `grad-${color.replace("#", "")}`;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) =>
              new Intl.NumberFormat("en-US", { notation: "compact" }).format(v)
            }
          />
          <Tooltip
            formatter={(v: number) => [valueFormatter(v), ""]}
            labelStyle={{ color: "#1c2438", fontWeight: 600 }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
