import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { CATEGORICAL as COLORS } from "@/lib/colors";

interface StationHourlyChartProps {
  /** Plot rows shaped { hour, [siteId]: kwh }. */
  rows: { hour: number; [id: string]: number }[];
  /** Series metadata for legend/tooltip labels. */
  series: { id: string; name: string; zip: string }[];
}

/** Average energy (kWh) per hour of day, one line per selected station. */
export function StationHourlyChart({ rows, series }: StationHourlyChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            tickFormatter={(h: number) => `${String(h).padStart(2, "0")}h`}
            interval={2}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            formatter={(v: number) => [`${v} kWh`, ""]}
            labelFormatter={(h) => `${String(h).padStart(2, "0")}:00`}
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((s, i) => (
            <Line
              key={s.id}
              type="monotone"
              dataKey={s.id}
              name={`${s.name} (${s.zip})`}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
