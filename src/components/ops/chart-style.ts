// Shared Recharts styling so the operations charts match the rest of the app.
export const AXIS_TICK = { fontSize: 11, fill: "#94a3b8" };
export const GRID_STROKE = "#eef2f7";
export const TOOLTIP_STYLE = { borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 };
export const TOOLTIP_LABEL = { color: "#1c2438", fontWeight: 600 };

export const compact = (v: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact" }).format(v);

/** "2023-11" -> "Nov 23" */
export function monthLabel(ym: string): string {
  return new Date(`${ym}-01T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

/** Fixed colour per repair category, used by every fault chart. */
export const CATEGORY_COLORS: Record<string, string> = {
  "Connector / Cable": "#2a78d6",
  "Software / Network": "#1baf7a",
  "Power / Electrical": "#eb6834",
  "Display / UI": "#eda100",
  "Physical Damage": "#e87ba4",
};
