// Service layer. Components call these functions (via TanStack Query) and never
// touch the data source directly. Today it returns mock data; swapping to the
// real Python backend means reimplementing these functions against fetch().

import type {
  ChargingSession,
  CityBreakdown,
  ConnectorBreakdown,
  FaultRecord,
  Granularity,
  ForecastPoint,
  HeatmapCell,
  LoadOptimization,
  LoadStats,
  NetworkKpis,
  PerformanceStats,
  Site,
  SiteComparison,
  TimeSeriesPoint,
} from "@/types";
import { generateDataset } from "./mock-data";
import type { MockDataset } from "./mock-data";
import { DEMO_NOW_MS } from "@/lib/demo-time";

let cache: MockDataset | null = null;
function dataset(): MockDataset {
  if (!cache) cache = generateDataset(DEMO_NOW_MS);
  return cache;
}

/** Simulate network latency so loading states are exercised. */
function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function withinRange(iso: string, fromMs: number, toMs: number): boolean {
  const t = new Date(iso).getTime();
  return t >= fromMs && t <= toMs;
}

// --- Sites ---

export function getSites(): Promise<Site[]> {
  return delay(dataset().sites);
}

// --- Network Overview KPIs ---

export function getNetworkKpis(range: {
  from: string;
  to: string;
}): Promise<NetworkKpis> {
  const { sites, sessions, faults, uptimePct, successRatePct } = dataset();
  const fromMs = new Date(range.from).getTime();
  const toMs = new Date(range.to).getTime();
  const inRange = sessions.filter((s) => withinRange(s.startTime, fromMs, toMs));

  const totalEnergyKwh = inRange.reduce((sum, s) => sum + s.energyKwh, 0);
  const totalRevenue = inRange.reduce((sum, s) => sum + s.revenue, 0);
  const customers = new Set(inRange.map((s) => s.customerId));
  // "Active now" — ~2% of the window's sessions charging concurrently. Stable and
  // timezone-independent (a single-instant overlap lands in dead hours and reads 0).
  const activeSessions = Math.round(inRange.length * 0.02);
  const offline = sites.filter((s) => !s.online).length;

  return delay({
    newChargingStations: sites.length,
    activeSessions,
    totalSessions: inRange.length,
    totalEnergyKwh: Math.round(totalEnergyKwh),
    totalRevenue: +totalRevenue.toFixed(2),
    newUsers: customers.size,
    faults: faults.filter((f) => f.status !== "resolved").length,
    connectivityLossPct: +((offline / sites.length) * 100).toFixed(1),
    uptimePct,
    successRatePct,
  });
}

export function getConnectorBreakdown(): Promise<ConnectorBreakdown[]> {
  const { sessions } = dataset();
  const counts = new Map<string, number>();
  for (const s of sessions) {
    counts.set(s.connectorType, (counts.get(s.connectorType) ?? 0) + 1);
  }
  return delay(
    [...counts.entries()].map(([connector, count]) => ({
      connector: connector as ConnectorBreakdown["connector"],
      count,
    }))
  );
}

export function getCityBreakdown(): Promise<CityBreakdown[]> {
  const { sites } = dataset();
  const counts = new Map<string, number>();
  for (const s of sites) counts.set(s.city, (counts.get(s.city) ?? 0) + 1);
  return delay(
    [...counts.entries()]
      .map(([city, siteCount]) => ({ city, siteCount }))
      .sort((a, b) => b.siteCount - a.siteCount)
  );
}

// --- Trends ---

function bucketKey(iso: string, granularity: Granularity): string {
  const d = new Date(iso);
  if (granularity === "day") {
    return d.toISOString().slice(0, 10);
  }
  if (granularity === "week") {
    const day = d.getUTCDay();
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
    return monday.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 7); // month
}

export function getEnergyTrend(
  granularity: Granularity
): Promise<TimeSeriesPoint[]> {
  const { sessions } = dataset();
  const buckets = new Map<string, number>();
  for (const s of sessions) {
    const key = bucketKey(s.startTime, granularity);
    buckets.set(key, (buckets.get(key) ?? 0) + s.energyKwh);
  }
  return delay(
    [...buckets.entries()]
      .map(([timestamp, value]) => ({ timestamp, value: Math.round(value) }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  );
}

export function getRevenueTrend(
  granularity: Granularity
): Promise<TimeSeriesPoint[]> {
  const { sessions } = dataset();
  const buckets = new Map<string, number>();
  for (const s of sessions) {
    const key = bucketKey(s.startTime, granularity);
    buckets.set(key, (buckets.get(key) ?? 0) + s.revenue);
  }
  return delay(
    [...buckets.entries()]
      .map(([timestamp, value]) => ({ timestamp, value: +value.toFixed(2) }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  );
}

// --- Load Utilization: 24x7 heatmap of hourly demand ---

export function getUtilizationHeatmap(siteId?: string): Promise<HeatmapCell[]> {
  const { sessions } = dataset();
  const grid = new Map<string, number>();
  for (const s of sessions) {
    if (siteId && s.siteId !== siteId) continue;
    const d = new Date(s.startTime);
    const key = `${d.getDay()}-${d.getHours()}`;
    grid.set(key, (grid.get(key) ?? 0) + s.energyKwh);
  }
  const cells: HeatmapCell[] = [];
  for (let dow = 0; dow < 7; dow++) {
    for (let hour = 0; hour < 24; hour++) {
      cells.push({
        dayOfWeek: dow,
        hour,
        value: Math.round(grid.get(`${dow}-${hour}`) ?? 0),
      });
    }
  }
  return delay(cells);
}

// --- Faults (Sprint 3 preview) ---

export function getFaults(): Promise<FaultRecord[]> {
  return delay(
    [...dataset().faults].sort(
      (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
    )
  );
}

// --- Sessions (raw, for tables / future use) ---

export function getRecentSessions(limit = 50): Promise<ChargingSession[]> {
  return delay(
    [...dataset().sessions]
      .sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      )
      .slice(0, limit)
  );
}

// --- Performance Analytics ---

export function getRevenueHeatmap(siteId?: string): Promise<HeatmapCell[]> {
  const { sessions } = dataset();
  const grid = new Map<string, number>();
  for (const s of sessions) {
    if (siteId && s.siteId !== siteId) continue;
    const d = new Date(s.startTime);
    const key = `${d.getDay()}-${d.getHours()}`;
    grid.set(key, (grid.get(key) ?? 0) + s.revenue);
  }
  const cells: HeatmapCell[] = [];
  for (let dow = 0; dow < 7; dow++) {
    for (let hour = 0; hour < 24; hour++) {
      cells.push({
        dayOfWeek: dow,
        hour,
        value: Math.round(grid.get(`${dow}-${hour}`) ?? 0),
      });
    }
  }
  return delay(cells);
}

export function getSiteComparison(): Promise<SiteComparison[]> {
  const { sites, sessions } = dataset();
  const byId = new Map<string, { energy: number; revenue: number; count: number }>();
  for (const s of sessions) {
    const cur = byId.get(s.siteId) ?? { energy: 0, revenue: 0, count: 0 };
    cur.energy += s.energyKwh;
    cur.revenue += s.revenue;
    cur.count += 1;
    byId.set(s.siteId, cur);
  }
  // 90-day window used by the generator.
  const windowHours = 90 * 24;
  const rows: SiteComparison[] = sites.map((site) => {
    const agg = byId.get(site.id) ?? { energy: 0, revenue: 0, count: 0 };
    // Rough utilization: assume avg 45 min/session vs port-hours available.
    const portHours = site.numPorts * windowHours;
    const usedHours = (agg.count * 45) / 60;
    return {
      siteId: site.id,
      name: site.name,
      city: site.city,
      energyKwh: Math.round(agg.energy),
      revenue: +agg.revenue.toFixed(2),
      sessions: agg.count,
      utilizationPct: +Math.min(100, (usedHours / portHours) * 100).toFixed(1),
    };
  });
  return delay(rows.sort((a, b) => b.energyKwh - a.energyKwh));
}

export function getLoadStats(siteId?: string): Promise<LoadStats> {
  const { sites, sessions } = dataset();
  const scoped = sessions.filter((s) => !siteId || s.siteId === siteId);
  const scopedSites = sites.filter((s) => !siteId || s.id === siteId);

  const totalEnergy = scoped.reduce((sum, s) => sum + s.energyKwh, 0);
  const ports = scopedSites.reduce((sum, s) => sum + s.numPorts, 0);
  const windowHours = 90 * 24;
  const usedHours = scoped.reduce((sum, s) => sum + s.durationMin / 60, 0);

  // Average kWh per hour-of-day (summed across ~90 days, then per-day mean).
  const hourSum = new Array(24).fill(0) as number[];
  for (const s of scoped) hourSum[new Date(s.startTime).getHours()] += s.energyKwh;
  let peakHour = 0;
  for (let h = 1; h < 24; h++) if (hourSum[h] > hourSum[peakHour]) peakHour = h;
  const peakLoadKwh = hourSum[peakHour] / 90;

  return delay({
    portOccupancyPct: ports
      ? +Math.min(100, (usedHours / (ports * windowHours)) * 100).toFixed(1)
      : 0,
    peakHour,
    peakLoadKwh: +peakLoadKwh.toFixed(1),
    totalEnergyKwh: Math.round(totalEnergy),
  });
}

/** Average kWh delivered per hour-of-day (0..23) for a scope, over ~90 days. */
function hourlyProfile(siteId?: string): number[] {
  const { sessions } = dataset();
  const sum = new Array(24).fill(0) as number[];
  for (const s of sessions) {
    if (siteId && s.siteId !== siteId) continue;
    sum[new Date(s.startTime).getHours()] += s.energyKwh;
  }
  return sum.map((v) => +(v / 90).toFixed(1)); // per-day average
}

/** 48-hour demand forecast from the fixed demo "now", per hour. */
export function getDemandForecast(siteId?: string): Promise<ForecastPoint[]> {
  const profile = hourlyProfile(siteId);
  const points: ForecastPoint[] = [];
  const start = new Date(DEMO_NOW_MS);
  start.setMinutes(0, 0, 0);
  for (let i = 1; i <= 48; i++) {
    const t = new Date(start.getTime() + i * 60 * 60 * 1000);
    const dow = t.getDay();
    const weekend = dow === 0 || dow === 6 ? 0.7 : 1;
    // Deterministic small wiggle so the line isn't perfectly periodic.
    const wiggle = 1 + (((i * 7) % 5) - 2) / 40;
    points.push({
      timestamp: t.toISOString(),
      kwh: +(profile[t.getHours()] * weekend * wiggle).toFixed(1),
    });
  }
  return delay(points);
}

export function getLoadOptimization(siteId?: string): Promise<LoadOptimization> {
  const profile = hourlyProfile(siteId);
  const ranked = profile
    .map((kwh, hour) => ({ hour, kwh }))
    .sort((a, b) => b.kwh - a.kwh);
  const avg = profile.reduce((s, v) => s + v, 0) / 24;
  const peakHours = ranked.slice(0, 3);
  // Lowest-demand hours (tie-break to the earliest hour → natural overnight
  // windows like 00:00–02:00 rather than random zero-demand hours).
  const offPeakHours = profile
    .map((kwh, hour) => ({ hour, kwh }))
    .sort((a, b) => a.kwh - b.kwh || a.hour - b.hour)
    .slice(0, 3)
    .sort((a, b) => a.hour - b.hour);
  const shiftableKwh = +peakHours
    .reduce((s, h) => s + Math.max(0, h.kwh - avg), 0)
    .toFixed(1);
  return delay({
    peakHours,
    offPeakHours,
    peakKwh: peakHours[0]?.kwh ?? 0,
    shiftableKwh,
  });
}

export function getPerformanceStats(): Promise<PerformanceStats> {
  const { sites, sessions } = dataset();
  const total = sessions.length;
  const totalDuration = sessions.reduce((sum, s) => sum + s.durationMin, 0);
  const totalEnergy = sessions.reduce((sum, s) => sum + s.energyKwh, 0);
  const totalPorts = sites.reduce((sum, s) => sum + s.numPorts, 0);
  const windowHours = 90 * 24;
  const usedHours = (total * (totalDuration / total)) / 60;
  return delay({
    avgSessionDurationMin: total ? Math.round(totalDuration / total) : 0,
    avgEnergyPerSession: total ? +(totalEnergy / total).toFixed(1) : 0,
    sessionsPerDay: Math.round(total / 90),
    utilizationPct: totalPorts
      ? +Math.min(100, (usedHours / (totalPorts * windowHours)) * 100).toFixed(1)
      : 0,
    totalSessions: total,
  });
}
