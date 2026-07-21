// Data model derived from the Sprint 2 block diagram (requirements doc).
// These types mirror what the Python backend will eventually return, so the
// mock service and the real API can be swapped without touching components.

export type ConnectorType = "J1772" | "CCS" | "CHAdeMO";
export type PlugType = "Type1" | "Type2" | "Tesla";
export type PortType = "AC" | "DC";

/** Session Logs: start & end time, Energy (kWh), Port/Plug type, CO2, Revenue, Customer ID */
export interface ChargingSession {
  id: string;
  siteId: string;
  startTime: string; // ISO
  endTime: string; // ISO
  energyKwh: number;
  portType: PortType;
  plugType: PlugType;
  connectorType: ConnectorType;
  co2SavedKg: number;
  revenue: number;
  customerId: string;
  /** Total session duration in minutes */
  durationMin: number;
}

/** Site Registry: GPS coordinates, Address, Zip, Date, Total Duration, Charging Time */
export interface Site {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  city: string;
  zip: string;
  connectorTypes: ConnectorType[];
  numPorts: number;
  online: boolean;
  commissionedDate: string; // ISO
}

export type FaultStatus = "open" | "in_progress" | "resolved";
export type FaultSeverity = "low" | "medium" | "high" | "critical";

/** Fault & Error records (synthetic — planned for Sprint 3). */
export interface FaultRecord {
  id: string;
  siteId: string;
  code: string;
  severity: FaultSeverity;
  status: FaultStatus;
  detectedAt: string; // ISO
  resolvedAt: string | null;
  /** Mean time to repair (hours) once resolved */
  mttrHours: number | null;
  description: string;
}

/** Aggregated KPI snapshot for the Network Overview landing page. */
export interface NetworkKpis {
  newChargingStations: number;
  activeSessions: number;
  totalSessions: number;
  totalEnergyKwh: number;
  totalRevenue: number;
  newUsers: number;
  faults: number;
  connectivityLossPct: number;
}

export interface ConnectorBreakdown {
  connector: ConnectorType;
  count: number;
}

export interface CityBreakdown {
  city: string;
  siteCount: number;
}

/** Generic time-bucketed value used by trend charts. */
export interface TimeSeriesPoint {
  timestamp: string; // ISO
  value: number;
}

export type Granularity = "day" | "week" | "month";

export interface DateRangeFilter {
  granularity: Granularity;
  from: string; // ISO
  to: string; // ISO
}

/** 24x7 heatmap cell: dayOfWeek 0..6 (Sun..Sat), hour 0..23 */
export interface HeatmapCell {
  dayOfWeek: number;
  hour: number;
  value: number;
}

/** Per-site aggregate for the site comparison chart/table. */
export interface SiteComparison {
  siteId: string;
  name: string;
  city: string;
  energyKwh: number;
  revenue: number;
  sessions: number;
  /** Average utilization estimate 0..100 (%) */
  utilizationPct: number;
}

/** Load Utilization headline stats (per station or whole network). */
export interface LoadStats {
  /** % of ports busy on average (0..100) */
  portOccupancyPct: number;
  /** Hour of day (0..23) with the highest average demand */
  peakHour: number;
  /** Average kWh delivered during the peak hour */
  peakLoadKwh: number;
  /** Total energy over the window (kWh) */
  totalEnergyKwh: number;
}

/** Headline performance stats for the analytics page. */
export interface PerformanceStats {
  avgSessionDurationMin: number;
  avgEnergyPerSession: number;
  sessionsPerDay: number;
  /** Session efficiency = delivered kWh / (ports * hours available), 0..100 */
  utilizationPct: number;
  totalSessions: number;
}
