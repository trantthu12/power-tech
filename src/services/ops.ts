// Operations data for the Infrastructure Planning, Sustainability and Fault
// Diagnostics pages, exported from the team workbook by
// scripts/export_ops_json.py into src/data/boulder-ops.json. Sessions, energy
// and emissions are real; ports, maintenance, telemetry and failed visits are
// synthetic (meta.synthetic lists those sections). The file is loaded lazily so
// it stays out of the main bundle.

export interface OpsPort {
  id: string;
  siteId: string;
  installDate: string;
  ageYears: number;
  ratedKw: number;
  voltage: number;
  breakerA: number;
  sessions: number;
  lastSession: string;
  active: boolean;
}

export interface ReliabilityMonth {
  month: string;
  uptimePct: number;
  mtbfH: number | null;
  mttrH: number | null;
  failures: number;
  events: number;
  portHours: number;
  downtimeH: number;
  failedVisits: number;
  visits: number;
  firstAttemptSuccesses: number;
  firstAttemptPct: number | null;
}

export interface MaintenanceEvent {
  id: string;
  portId: string;
  siteId: string;
  code: string;
  category: string;
  failure: boolean;
  start: string;
  end: string;
  repairH: number;
  costUsd: number;
  part: string | null;
  technician: boolean;
}

export interface PortRisk {
  portId: string;
  siteId: string;
  probability: number;
  alert: boolean;
  failures365d: number;
  daysSinceLastFailure: number | null;
  telemetry7d: Record<"connector_warnings" | "trip_events" | "auth_failures" | "comm_dropouts", number>;
  topFactors: string[];
}

export interface FaultModel {
  name: string;
  horizonDays: number;
  threshold: number;
  trainedOn: string;
  thresholdSetOn: string;
  testedOn: string;
  test: { rocAuc: number; precision: number; recall: number };
}

export type RiComponent = "uptime" | "firstAttempt" | "failures" | "maintenanceCost";
export type DiComponent = "sessions" | "dwell" | "occupancy" | "allBusy";
export type Quadrant = "expand" | "refurbish" | "decommission" | "retain";

/** One station on the action matrix, scored over the last 12 months. */
export interface MatrixStation {
  siteId: string;
  zip: string;
  use: "public" | "fleet";
  active: boolean;
  ports: number;
  sessions12m: number;
  growthPct: number | null;
  /** Reliability Index, 0-100. */
  ri: number;
  /** Demand Pressure Index, 0-100. */
  di: number;
  quadrant: Quadrant;
  /** Raw value and 0-100 score of each component (null when there is no data). */
  components: Record<RiComponent | DiComponent, { value: number | null; score: number | null }>;
  /** Ports to add; only "expand" stations get a non-zero value. */
  addPorts: number;
  /** Null when the station has no full previous year to forecast from. */
  forecast: { next6mKwh: number | null; sameMonthsLastYearKwh: number; growthPct: number | null };
}

export interface OpsData {
  meta: { source: string; dateEnd: string; synthetic: string[]; note: string };
  ports: OpsPort[];
  reliability: ReliabilityMonth[];
  events: MaintenanceEvent[];
  risk: { model: FaultModel; ports: PortRisk[] };
  sustainability: {
    yearly: { year: number; sessions: number; energyKwh: number; co2Kg: number; gasolineGal: number }[];
    byUse: Record<"public" | "fleet", { sessions: number; energyKwh: number }>;
    ageingYears: number;
  };
  infrastructure: {
    window: { from: string; to: string };
    targetOccupancyPct: number;
    matrix: {
      midpoint: number;
      weights: { ri: Record<RiComponent, number>; di: Record<DiComponent, number> };
      /** Component value that scores 0 and the value that scores 100. */
      anchors: Record<RiComponent | DiComponent, [number, number]>;
      stations: MatrixStation[];
    };
    forecast: {
      history: { month: string; energyKwh: number }[];
      forecast: { month: string; energyKwh: number }[];
      growthPct: number;
    };
    networkPeak: { peakKw12m: number; meanDailyPeakKw12m: number; installedKw: number };
  };
}

let pending: Promise<OpsData> | null = null;

export function getOpsData(): Promise<OpsData> {
  pending ??= import("@/data/boulder-ops.json").then((m) => m.default as unknown as OpsData);
  return pending;
}

/** Network reliability over the last 12 months of data. */
export function reliability12m(ops: OpsData) {
  const months = ops.reliability.slice(-12);
  const from = months[0].month;
  const sum = (k: "portHours" | "downtimeH" | "failures" | "visits" | "failedVisits" | "firstAttemptSuccesses") =>
    months.reduce((a, m) => a + m[k], 0);
  const failures = ops.events.filter((e) => e.failure && e.start.slice(0, 7) >= from);
  const events12 = ops.events.filter((e) => e.start.slice(0, 7) >= from);
  const portHours = sum("portHours");
  const downtime = sum("downtimeH");
  return {
    from,
    uptimePct: 100 * (1 - downtime / portHours),
    mtbfH: (portHours - downtime) / sum("failures"),
    mttrH: failures.reduce((a, e) => a + e.repairH, 0) / failures.length,
    costUsd: events12.reduce((a, e) => a + e.costUsd, 0),
    firstAttemptPct: (100 * sum("firstAttemptSuccesses")) / sum("visits"),
    failedVisits: sum("failedVisits"),
  };
}

export interface FaultSummary {
  code: string;
  category: string;
  failures: number;
  mttrH: number;
  costUsd: number;
  stations: number;
}

/** Failures per fault code over the last 12 months, most frequent first. */
export function topFaults(ops: OpsData, n: number): FaultSummary[] {
  const from = ops.reliability.slice(-12)[0].month;
  const byCode = new Map<string, { category: string; failures: number; repairH: number; cost: number; sites: Set<string> }>();
  for (const e of ops.events) {
    if (!e.failure || e.start.slice(0, 7) < from) continue;
    const c = byCode.get(e.code) ?? { category: e.category, failures: 0, repairH: 0, cost: 0, sites: new Set<string>() };
    c.failures += 1;
    c.repairH += e.repairH;
    c.cost += e.costUsd;
    c.sites.add(e.siteId);
    byCode.set(e.code, c);
  }
  return [...byCode.entries()]
    .map(([code, c]) => ({
      code,
      category: c.category,
      failures: c.failures,
      mttrH: c.repairH / c.failures,
      costUsd: c.cost,
      stations: c.sites.size,
    }))
    .sort((a, b) => b.failures - a.failures || b.costUsd - a.costUsd)
    .slice(0, n);
}
