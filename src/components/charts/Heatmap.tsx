import { useMemo } from "react";
import type { HeatmapCell } from "@/types";

interface HeatmapProps {
  data: HeatmapCell[];
  /** Color ramp end (max value color) */
  color?: string;
  valuePrefix?: string;
  valueSuffix?: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const BASE = { r: 241, g: 245, b: 249 }; // slate-100, the empty-cell color

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/**
 * 24×7 hour-of-day / weekday heatmap. Plain CSS grid (no chart library) with a
 * single-hue sequential ramp from slate-100 to the given color.
 */
export function Heatmap({
  data,
  color = "#5fa32f",
  valuePrefix = "",
  valueSuffix = "",
}: HeatmapProps) {
  const fmt = useMemo(() => new Intl.NumberFormat("en-US"), []);
  const target = useMemo(() => hexToRgb(color), [color]);
  const max = useMemo(() => data.reduce((m, c) => Math.max(m, c.value), 0), [data]);
  // grid[dayOfWeek][hour] = value
  const grid = useMemo(() => {
    const g: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const c of data) {
      if (g[c.dayOfWeek]) g[c.dayOfWeek][c.hour] = c.value;
    }
    return g;
  }, [data]);

  const cellColor = (v: number) => {
    const t = max ? v / max : 0;
    const r = Math.round(BASE.r + (target.r - BASE.r) * t);
    const g = Math.round(BASE.g + (target.g - BASE.g) * t);
    const b = Math.round(BASE.b + (target.b - BASE.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div
      className="w-full overflow-x-auto"
      role="img"
      aria-label="Heatmap of demand by hour of day and weekday"
    >
      <div className="min-w-130">
        {DAYS.map((day, dow) => (
          <div key={day} className="mb-0.5 flex items-center gap-1">
            <span className="w-9 shrink-0 text-right text-[11px] text-slate-500">
              {day}
            </span>
            <div
              className="grid flex-1 gap-0.5"
              style={{ gridTemplateColumns: "repeat(24, 1fr)" }}
            >
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="h-6 rounded-xs"
                  style={{ backgroundColor: cellColor(grid[dow][h]) }}
                  title={`${day} ${h}:00 — ${valuePrefix}${fmt.format(grid[dow][h])}${valueSuffix}`}
                />
              ))}
            </div>
          </div>
        ))}
        {/* Hour axis (every 2 hours) */}
        <div className="flex items-center gap-1">
          <span className="w-9 shrink-0" />
          <div
            className="grid flex-1 gap-0.5"
            style={{ gridTemplateColumns: "repeat(24, 1fr)" }}
          >
            {HOURS.map((h) => (
              <span key={h} className="text-center text-[9px] text-slate-400">
                {h % 2 === 0 ? h : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
