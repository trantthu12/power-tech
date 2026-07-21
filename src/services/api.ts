// Service layer. Components call these functions (via TanStack Query) and never
// touch the data source directly. Today it returns mock data; swapping to the
// real Python backend means reimplementing these functions against fetch().

import type {
  ChargingSession,
  CityBreakdown,
  ConnectorBreakdown,
  FaultRecord,
  Granularity,
  HeatmapCell,
  NetworkKpis,
  Site,
  TimeSeriesPoint,
} from "@/types";
import { generateDataset } from "./mock-data";
import type { MockDataset } from "./mock-data";

// Fixed "now" so the dataset is deterministic. Update when refreshing the demo.
const DEMO_NOW = new Date("2026-07-20T12:00:00Z").getTime();

let cache: MockDataset | null = null;
function dataset(): MockDataset {
  if (!cache) cache = generateDataset(DEMO_NOW);
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
  const { sites, sessions, faults } = dataset();
  const fromMs = new Date(range.from).getTime();
  const toMs = new Date(range.to).getTime();
  const inRange = sessions.filter((s) => withinRange(s.startTime, fromMs, toMs));

  const totalEnergyKwh = inRange.reduce((sum, s) => sum + s.energyKwh, 0);
  const totalRevenue = inRange.reduce((sum, s) => sum + s.revenue, 0);
  const customers = new Set(inRange.map((s) => s.customerId));
  const activeSessions = sessions.filter((s) =>
    withinRange(new Date().toISOString(), new Date(s.startTime).getTime(), new Date(s.endTime).getTime())
  ).length;
  const offline = sites.filter((s) => !s.online).length;

  return delay({
    newChargingStations: sites.length,
    activeSessions: Math.max(activeSessions, Math.round(inRange.length * 0.02)),
    totalSessions: inRange.length,
    totalEnergyKwh: Math.round(totalEnergyKwh),
    totalRevenue: +totalRevenue.toFixed(2),
    newUsers: customers.size,
    faults: faults.filter((f) => f.status !== "resolved").length,
    connectivityLossPct: +((offline / sites.length) * 100).toFixed(1),
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
