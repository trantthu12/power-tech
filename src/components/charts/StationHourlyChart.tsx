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
  /** Rows shaped { hour, [stationName]: kwh }. */
  data: { hour: number; [station: string]: number }[];
}

/** Average energy (kWh) per hour of day, one line per station. */
export function StationHourlyChart({ data }: StationHourlyChartProps) {
  const stations = data.length ? Object.keys(data[0]).filter((k) => k !== "hour") : [];

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
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
          {stations.map((name, i) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
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
