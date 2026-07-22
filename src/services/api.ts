// Service layer. Components call these (via TanStack Query) and never touch the
// data source. Everything here is derived from the REAL City of Boulder open
// dataset (src/data/boulder-data.json). Swapping to a live Python backend means
// reimplementing these against fetch().

import type {
  ForecastPoint,
  Granularity,
  HeatmapCell,
  LoadOptimization,
  LoadStats,
  NetworkKpis,
  PerformanceStats,
  Site,
  SiteComparison,
  TimeSeriesPoint,
} from "@/types";
import { buildDataset } from "./mock-data";
import type { Dataset } from "./mock-data";
import { DEMO_NOW_MS } from "@/lib/demo-time";

let cache: Dataset | null = null;
function data(): Dataset {
  if (!cache) cache = buildDataset();
  return cache;
}

function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function dataAsOf(): string {
  return data().dateEnd;
}

// --- heatmap / hourly helpers -------------------------------------------------

function heatFor(siteId?: string): number[] {
  const d = data();
  if (!siteId) return d.heatAll;
  const site = d.sites.find((s) => s.id === siteId);
  return site ? site.heat : new Array(168).fill(0);
}

function heatToCells(heat: number[], scale = 1): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  for (let dow = 0; dow < 7; dow++)
    for (let hour = 0; hour < 24; hour++)
      cells.push({ dayOfWeek: dow, hour, value: Math.round((heat[dow * 24 + hour] ?? 0) * scale) });
  return cells;
}

/** Average kWh per hour-of-day (0..23) per day, from a 168-cell heat array. */
function hourlyProfile(heat: number[]): number[] {
  const { numDays } = data();
  const out = new Array(24).fill(0) as number[];
  for (let dow = 0; dow < 7; dow++)
    for (let h = 0; h < 24; h++) out[h] += heat[dow * 24 + h] ?? 0;
  return out.map((v) => +(v / Math.max(1, numDays)).toFixed(1));
}

// --- sites --------------------------------------------------------------------

export function getSites(): Promise<Site[]> {
  return delay(data().sites as Site[]);
}

// --- Network Overview KPIs (all real) ----------------------------------------

export function getNetworkKpis(range: { from: string; to: string }): Promise<NetworkKpis> {
  const d = data();
  const from = range.from.slice(0, 10);
  const to = range.to.slice(0, 10);
  const win = d.dailyTotals.filter((r) => r.date >= from && r.date <= to);
  const sessions = win.reduce((s, r) => s + r.sessions, 0);
  const energy = win.reduce((s, r) => s + r.energyKwh, 0);
  return delay({
    totalStations: d.sites.length,
    totalSessions: sessions,
    totalEnergyKwh: Math.round(energy),
    totalCo2Kg: Math.round(energy * d.co2PerKwh),
  });
}

/** Energy delivered grouped by ZIP (Boulder is a single city). */
export function getEnergyByZip(): Promise<{ zip: string; energyKwh: number }[]> {
  const sums = new Map<string, number>();
  for (const s of data().sites)
    sums.set(s.zip, (sums.get(s.zip) ?? 0) + s.energyKwh);
  return delay(
    [...sums.entries()]
      .map(([zip, energyKwh]) => ({ zip, energyKwh: Math.round(energyKwh) }))
      .sort((a, b) => b.energyKwh - a.energyKwh)
  );
}

/** Top stations by real energy delivered. */
export function getTopStations(limit = 5): Promise<{ name: string; energyKwh: number }[]> {
  return delay(
    [...data().sites]
      .sort((a, b) => b.energyKwh - a.energyKwh)
      .slice(0, limit)
      .map((s) => ({ name: s.name, energyKwh: s.energyKwh }))
  );
}

// --- trends -------------------------------------------------------------------

function bucketKey(date: string, g: Granularity): string {
  if (g === "day") return date;
  const d = new Date(date + "T00:00:00Z");
  if (g === "week") {
    const day = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
    return d.toISOString().slice(0, 10);
  }
  return date.slice(0, 7); // month
}

function trend(granularity: Granularity, scale: number, digits: number): TimeSeriesPoint[] {
  const buckets = new Map<string, number>();
  for (const r of data().dailyTotals) {
    const k = bucketKey(r.date, granularity);
    buckets.set(k, (buckets.get(k) ?? 0) + r.energyKwh * scale);
  }
  return [...buckets.entries()]
    .map(([timestamp, value]) => ({ timestamp, value: +value.toFixed(digits) }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function getEnergyTrend(g: Granularity): Promise<TimeSeriesPoint[]> {
  return delay(trend(g, 1, 0));
}
export function getCo2Trend(g: Granularity): Promise<TimeSeriesPoint[]> {
  return delay(trend(g, data().co2PerKwh, 0));
}

// --- heatmaps -----------------------------------------------------------------

export function getUtilizationHeatmap(siteId?: string): Promise<HeatmapCell[]> {
  return delay(heatToCells(heatFor(siteId)));
}
export function getCo2Heatmap(siteId?: string): Promise<HeatmapCell[]> {
  return delay(heatToCells(heatFor(siteId), data().co2PerKwh));
}

// --- site comparison ----------------------------------------------------------

export function getSiteComparison(): Promise<SiteComparison[]> {
  const rows: SiteComparison[] = data().sites.map((s) => ({
    siteId: s.id,
    name: s.name,
    city: s.city,
    energyKwh: s.energyKwh,
    sessions: s.sessions,
  }));
  return delay(rows.sort((a, b) => b.energyKwh - a.energyKwh));
}

// --- performance stats (all real) --------------------------------------------

export function getPerformanceStats(): Promise<PerformanceStats> {
  const d = data();
  return delay({
    avgSessionDurationMin: d.avgDurationMin,
    avgEnergyPerSession: +(d.totalEnergyKwh / d.totalSessions).toFixed(1),
    sessionsPerDay: Math.round(d.totalSessions / d.numDays),
    totalCo2Kg: d.totalCo2Kg,
  });
}

// --- Load Utilization ---------------------------------------------------------

export function getLoadStats(siteId?: string): Promise<LoadStats> {
  const d = data();
  const heat = heatFor(siteId);
  const profile = hourlyProfile(heat);
  const totalEnergyKwh = heat.reduce((s, v) => s + v, 0);
  let peakHour = 0;
  for (let h = 1; h < 24; h++) if (profile[h] > profile[peakHour]) peakHour = h;
  return delay({
    peakHour,
    peakLoadKwh: +profile[peakHour].toFixed(1),
    totalEnergyKwh: Math.round(totalEnergyKwh),
    totalCo2Kg: Math.round(totalEnergyKwh * d.co2PerKwh),
  });
}

export function getDemandForecast(siteId?: string): Promise<ForecastPoint[]> {
  const profile = hourlyProfile(heatFor(siteId));
  const points: ForecastPoint[] = [];
  const start = new Date(DEMO_NOW_MS);
  start.setMinutes(0, 0, 0);
  for (let i = 1; i <= 48; i++) {
    const t = new Date(start.getTime() + i * 3600000);
    const dow = t.getDay();
    const weekend = dow === 0 || dow === 6 ? 0.7 : 1;
    const wiggle = 1 + (((i * 7) % 5) - 2) / 40;
    points.push({
      timestamp: t.toISOString(),
      kwh: +(profile[t.getHours()] * weekend * wiggle).toFixed(1),
    });
  }
  return delay(points);
}

export function getLoadOptimization(siteId?: string): Promise<LoadOptimization> {
  const profile = hourlyProfile(heatFor(siteId));
  const ranked = profile.map((kwh, hour) => ({ hour, kwh })).sort((a, b) => b.kwh - a.kwh);
  const avg = profile.reduce((s, v) => s + v, 0) / 24;
  const peakHours = ranked.slice(0, 3);
  const offPeakHours = profile
    .map((kwh, hour) => ({ hour, kwh }))
    .sort((a, b) => a.kwh - b.kwh || a.hour - b.hour)
    .slice(0, 3)
    .sort((a, b) => a.hour - b.hour);
  const shiftableKwh = +peakHours.reduce((s, h) => s + Math.max(0, h.kwh - avg), 0).toFixed(1);
  return delay({ peakHours, offPeakHours, peakKwh: peakHours[0]?.kwh ?? 0, shiftableKwh });
}
