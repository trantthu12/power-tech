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

interface Row {
  hour: number;
  weekday: number;
  weekend: number;
}

const WEEKDAY = "#5fa32f";
const WEEKEND = "#2a78d6";

/** Average kWh per hour of day, weekday vs weekend. */
export function WeekdayWeekendChart({ data }: { data: Row[] }) {
  const chartData = data.map((r) => ({
    label: `${String(r.hour).padStart(2, "0")}:00`,
    Weekday: r.weekday,
    Weekend: r.weekend,
  }));

  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            interval={2}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(v: number) =>
              new Intl.NumberFormat("en-US", { notation: "compact" }).format(v)
            }
          />
          <Tooltip
            formatter={(v: number, name) => [`${v} kWh`, name]}
            labelStyle={{ color: "#1c2438", fontWeight: 600 }}
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />
          <Line
            type="monotone"
            dataKey="Weekday"
            stroke={WEEKDAY}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="Weekend"
            stroke={WEEKEND}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
