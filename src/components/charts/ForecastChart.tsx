import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ForecastPoint } from "@/types";

interface ForecastChartProps {
  data: ForecastPoint[];
  color?: string;
}

function hourLabel(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  // Mark midnight with the weekday so the 2-day span is readable.
  if (h === 0)
    return d.toLocaleDateString("en-US", { weekday: "short" });
  return `${String(h).padStart(2, "0")}h`;
}

export function ForecastChart({ data, color = "#2a78d6" }: ForecastChartProps) {
  const chartData = data.map((p) => ({
    label: hourLabel(p.timestamp),
    full: new Date(p.timestamp).toLocaleString("en-US", {
      weekday: "short",
      hour: "2-digit",
    }),
    kwh: p.kwh,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            interval={5}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v: number) =>
              new Intl.NumberFormat("en-US", { notation: "compact" }).format(v)
            }
          />
          <Tooltip
            formatter={(v: number) => [`${v} kWh`, "Forecast"]}
            labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ""}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="kwh"
            stroke={color}
            strokeWidth={2}
            strokeDasharray="5 4"
            fill="url(#forecastGrad)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
