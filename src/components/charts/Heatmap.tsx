import ReactECharts from "echarts-for-react";
import type { HeatmapCell } from "@/types";

interface HeatmapProps {
  data: HeatmapCell[];
  /** Color ramp end (max value color) */
  color?: string;
  valuePrefix?: string;
  valueSuffix?: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, h) => `${h}`);

export function Heatmap({
  data,
  color = "#5fa32f",
  valuePrefix = "",
  valueSuffix = "",
}: HeatmapProps) {
  const max = data.reduce((m, c) => Math.max(m, c.value), 0);
  // ECharts expects [xIndex, yIndex, value]
  const points = data.map((c) => [c.hour, c.dayOfWeek, c.value]);

  const option = {
    tooltip: {
      position: "top",
      formatter: (p: { data: [number, number, number] }) => {
        const [hour, dow, value] = p.data;
        return `${DAYS[dow]} ${hour}:00<br/><b>${valuePrefix}${new Intl.NumberFormat(
          "en-US"
        ).format(value)}${valueSuffix}</b>`;
      },
    },
    grid: { top: 10, left: 44, right: 10, bottom: 24 },
    xAxis: {
      type: "category",
      data: HOURS,
      splitArea: { show: true },
      axisLabel: {
        fontSize: 10,
        color: "#94a3b8",
        interval: 2,
      },
      axisLine: { lineStyle: { color: "#e2e8f0" } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "category",
      data: DAYS,
      splitArea: { show: true },
      axisLabel: { fontSize: 11, color: "#64748b" },
      axisLine: { lineStyle: { color: "#e2e8f0" } },
      axisTick: { show: false },
    },
    visualMap: {
      min: 0,
      max: max || 1,
      calculable: false,
      show: false,
      inRange: { color: ["#f1f5f9", color] },
    },
    series: [
      {
        type: "heatmap",
        data: points,
        itemStyle: { borderColor: "#fff", borderWidth: 1 },
        emphasis: { itemStyle: { borderColor: "#334155", borderWidth: 1 } },
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: 240, width: "100%" }}
      opts={{ renderer: "svg" }}
    />
  );
}
