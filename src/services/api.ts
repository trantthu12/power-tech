// Service layer. Components call these (via TanStack Query) and never touch the
// data source. Everything here is derived from the REAL City of Boulder open
// dataset (src/data/boulder-data.json). Swapping to a live Python backend means
// reimplementing these against fetch().

import type {
  ConnectorCount,
  ForecastPoint,
  Granularity,
  GrowthPoint,
  HeatmapCell,
  InfraStats,
  LoadOptimization,
  LoadStats,
  NetworkCount,
  NetworkKpis,
  PerformanceStats,
  PublicStation,
  Site,
  SiteComparison,
  TimeSeriesPoint,
} from "@/types";
import { buildDataset } from "./mock-data";
import type { Dataset } from "./mock-data";
import stationsData from "@/data/boulder-stations.json";
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
  // Every city-operated station in the dataset is Level 2 (AC / J1772) — the raw
  // Port_Type field is "Level 2" for all sessions — so DC-fast share is 0.
  const acStations = d.sites.filter((s) => !s.connectorTypes.some((c) => c === "CCS" || c === "CHAdeMO")).length;
  return delay({
    totalStations: d.sites.length,
    totalSessions: sessions,
    totalEnergyKwh: Math.round(energy),
    totalCo2Kg: Math.round(energy * d.co2PerKwh),
    totalGasolineGal: Math.round(energy * d.galPerKwh),
    avgUtilizationPct: d.avgUtilizationPct,
    acSharePct: Math.round((100 * acStations) / d.sites.length),
  });
}

/** Top N stations by real energy, grouped by ZIP "area" (with area totals). */
export function getTopStationsByArea(
  perArea = 3
): Promise<
  {
    zip: string;
    stationCount: number;
    energyKwh: number;
    stations: { name: string; energyKwh: number }[];
  }[]
> {
  const byZip = new Map<string, { name: string; energyKwh: number }[]>();
  for (const s of data().sites) {
    const list = byZip.get(s.zip) ?? [];
    list.push({ name: s.name, energyKwh: s.energyKwh });
    byZip.set(s.zip, list);
  }
  const areas = [...byZip.entries()].map(([zip, list]) => {
    const stations = list.sort((a, b) => b.energyKwh - a.energyKwh).slice(0, perArea);
    return {
      zip,
      stationCount: list.length,
      energyKwh: list.reduce((sum, x) => sum + x.energyKwh, 0),
      stations,
    };
  });
  return delay(areas.sort((a, b) => b.energyKwh - a.energyKwh));
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

// Assumed wholesale electricity cost (USD/kWh) — Xcel Energy Colorado commercial
// secondary rate, ~$0.11/kWh. Used only to estimate the cost side of revenue.
const ELECTRICITY_COST_PER_KWH = 0.11;

export function getPerformanceStats(): Promise<PerformanceStats> {
  const d = data();
  return delay({
    avgSessionDurationMin: d.avgDurationMin,
    avgEnergyPerSession: +(d.totalEnergyKwh / d.totalSessions).toFixed(1),
    sessionsPerDay: Math.round(d.totalSessions / d.numDays),
    totalCo2Kg: d.totalCo2Kg,
    totalRevenue: d.totalRevenue,
    avgRevenuePerSession: +(d.totalRevenue / d.totalSessions).toFixed(2),
    electricityCost: Math.round(d.totalEnergyKwh * ELECTRICITY_COST_PER_KWH),
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
  const utilization = siteId
    ? d.sites.find((s) => s.id === siteId)?.utilizationPct ?? d.avgUtilizationPct
    : d.avgUtilizationPct;
  return delay({
    peakHour,
    peakLoadKwh: +profile[peakHour].toFixed(1),
    totalEnergyKwh: Math.round(totalEnergyKwh),
    totalCo2Kg: Math.round(totalEnergyKwh * d.co2PerKwh),
    avgUtilizationPct: utilization,
  });
}

/** Station picker options, sorted by total energy (busiest first). */
export function getStationOptions(): Promise<{ id: string; name: string; zip: string }[]> {
  return delay(
    [...data().sites]
      .sort((a, b) => b.energyKwh - a.energyKwh)
      .map((s) => ({ id: s.id, name: s.name, zip: s.zip }))
  );
}

/**
 * Average hourly energy (kWh) profile for the given stations (keyed by site id).
 * Returns the plot rows plus the series metadata (name + ZIP area) for legends.
 */
export function getStationHourly(ids: string[]): Promise<{
  rows: { hour: number; [id: string]: number }[];
  series: { id: string; name: string; zip: string }[];
}> {
  const d = data();
  const chosen = d.sites.filter((s) => ids.includes(s.id));
  const series = chosen.map((s) => ({ id: s.id, name: s.name, zip: s.zip }));
  const profiles = chosen.map((s) => ({ id: s.id, profile: hourlyProfile(s.heat) }));
  const rows: { hour: number; [id: string]: number }[] = [];
  for (let h = 0; h < 24; h++) {
    const row: { hour: number; [id: string]: number } = { hour: h };
    for (const p of profiles) row[p.id] = p.profile[h];
    rows.push(row);
  }
  return delay({ rows, series });
}

/**
 * Expansion signals: rank ZIP areas by demand intensity (energy per station) so
 * the planner can see where to add capacity. NOTE: the open dataset has no port
 * capacity, so this uses real demand intensity + charger utilization as a proxy
 * for the reviewer's ">95% occupancy" idea rather than true occupancy.
 */
export function getExpansionSignals(): Promise<
  { zip: string; stations: number; energyKwh: number; energyPerStation: number; utilizationPct: number }[]
> {
  const d = data();
  const byZip = new Map<string, { stations: number; energyKwh: number; util: number }>();
  for (const s of d.sites) {
    const cur = byZip.get(s.zip) ?? { stations: 0, energyKwh: 0, util: 0 };
    cur.stations++;
    cur.energyKwh += s.energyKwh;
    cur.util += s.utilizationPct;
    byZip.set(s.zip, cur);
  }
  const rows = [...byZip.entries()].map(([zip, v]) => ({
    zip,
    stations: v.stations,
    energyKwh: Math.round(v.energyKwh),
    energyPerStation: Math.round(v.energyKwh / v.stations),
    utilizationPct: Math.round(v.util / v.stations),
  }));
  return delay(rows.sort((a, b) => b.energyPerStation - a.energyPerStation));
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

// --- Infrastructure Planning (real public-station inventory, Colorado AFDC) ----
// This is a second real, independent dataset: the full public EV-charging
// landscape of Boulder (204 stations across 11 networks), separate from the
// City's own sessions data used elsewhere.

const infra = stationsData as unknown as {
  meta: {
    source: string;
    total: number;
    l2Ports: number;
    dcFastPorts: number;
    networks: number;
    newestYear: number;
    newestYearCount: number;
  };
  byNetwork: NetworkCount[];
  byConnector: ConnectorCount[];
  growth: GrowthPoint[];
  stations: PublicStation[];
};

/**
 * AC vs DC split of the Boulder public charging network (AFDC connectors).
 * DC = stations offering a true DC-fast standard (CCS or CHAdeMO). J1772 is AC;
 * Tesla is counted as AC because Boulder's Tesla entries are Level-2 "Destination"
 * chargers, not DC Superchargers.
 */
export function getChargerPowerMix(): Promise<{ ac: number; dc: number; total: number }> {
  const DC = new Set(["CCS", "CHAdeMO"]);
  const total = infra.stations.length;
  const dc = infra.stations.filter((s) => s.connectors.some((c) => DC.has(c))).length;
  return delay({ ac: total - dc, dc, total });
}

export function getInfraStats(): Promise<InfraStats> {
  const m = infra.meta;
  return delay({
    totalStations: m.total,
    l2Ports: m.l2Ports,
    dcFastPorts: m.dcFastPorts,
    networks: m.networks,
    newestYear: m.newestYear,
    newestYearCount: m.newestYearCount,
  });
}

export function getStationsByNetwork(): Promise<NetworkCount[]> {
  return delay(infra.byNetwork);
}

export function getConnectorMix(): Promise<ConnectorCount[]> {
  return delay(infra.byConnector);
}

export function getInfraGrowth(): Promise<GrowthPoint[]> {
  return delay(infra.growth);
}

export function getPublicStations(): Promise<PublicStation[]> {
  return delay(infra.stations);
}
