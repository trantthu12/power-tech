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

export type McdaCriterion = "occupancy" | "growth" | "peakLoad" | "downtime";

/** Planning metrics for one area (ZIP) or one station over the last 12 months. */
export interface PlanningRow {
  ports: number;
  installedKw: number;
  sessions12m: number;
  sessionsPrev12m: number;
  growthPct: number | null;
  occupancyPct: number;
  peakKw: number;
  peakLoadPct: number;
  uptimePct: number | null;
  score: number;
  /** Weighted contribution of each criterion to the score (points, sums to score). */
  criteria: Record<McdaCriterion, number>;
}

export interface ZipPlanning extends PlanningRow {
  zip: string;
  addPorts: number;
}

export interface StationPlanning extends PlanningRow {
  siteId: string;
  zip: string;
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
    weights: Record<McdaCriterion, number>;
    targetOccupancyPct: number;
    zips: ZipPlanning[];
    stations: StationPlanning[];
    forecast: {
      history: { month: string; energyKwh: number }[];
      forecast: { month: string; energyKwh: number }[];
      growthPct: number;
      byZip: { zip: string; next6mKwh: number; sameMonthsLastYearKwh: number; growthPct: number }[];
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
