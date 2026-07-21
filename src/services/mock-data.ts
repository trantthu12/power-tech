// Seeded mock data generator. Deterministic so charts stay stable across
// reloads and demos. Sites are REAL Metro Vancouver (BC) charging stations
// pulled from Open Charge Map (src/data/ocm-sites.json); sessions/faults are
// synthetic demo data generated on top of those real sites.

import type {
  ChargingSession,
  ConnectorType,
  FaultRecord,
  FaultSeverity,
  FaultStatus,
  PlugType,
  PortType,
  Site,
} from "@/types";
import ocmSites from "@/data/ocm-sites.json";

interface OcmSite {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  city: string;
  zip: string;
  connectorTypes: string[];
  numPorts: number;
}

/** Mulberry32 — tiny deterministic PRNG. */
function makeRng(seed: number) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function randBetween(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

const PLUGS: PlugType[] = ["Type1", "Type2", "Tesla"];

const FAULT_CODES = [
  "E-101 Overcurrent",
  "E-204 Ground Fault",
  "E-311 Comms Timeout",
  "E-402 Connector Lock",
  "E-509 Overtemp",
  "E-612 Meter Fault",
];

const SEVERITIES: FaultSeverity[] = ["low", "medium", "high", "critical"];

export interface MockDataset {
  sites: Site[];
  sessions: ChargingSession[];
  faults: FaultRecord[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Build a full dataset anchored to `now`. Caller passes a fixed timestamp so
 * the generator stays deterministic (no Date.now() inside).
 */
export function generateDataset(nowMs: number, seed = 42): MockDataset {
  const rng = makeRng(seed);

  // --- Sites: real OCM stations + deterministic operational status/date ---
  const sites: Site[] = (ocmSites as OcmSite[]).map((s) => {
    const commissioned = new Date(nowMs - randBetween(rng, 180, 1500) * DAY_MS);
    return {
      id: s.id,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      address: s.address,
      city: s.city,
      zip: s.zip,
      connectorTypes: s.connectorTypes as ConnectorType[],
      numPorts: s.numPorts,
      online: rng() > 0.06, // ~6% shown offline for the demo
      commissionedDate: commissioned.toISOString(),
    };
  });

  // --- Sessions (last 90 days) ---
  const sessions: ChargingSession[] = [];
  const HORIZON_DAYS = 90;
  let sessionIdx = 0;
  for (let d = 0; d < HORIZON_DAYS; d++) {
    const dayStart = nowMs - d * DAY_MS;
    // Weekday/weekend + weekly-growth shaping.
    const dow = new Date(dayStart).getDay();
    const weekendFactor = dow === 0 || dow === 6 ? 0.65 : 1;
    const growth = 1 - d / (HORIZON_DAYS * 2); // slight recent growth
    const sessionsToday = Math.round(
      randBetween(rng, 45, 90) * weekendFactor * growth
    );

    for (let s = 0; s < sessionsToday; s++) {
      sessionIdx++;
      const site = pick(rng, sites);
      // Bimodal start hour: morning + evening peaks.
      const peak = rng() > 0.5 ? 9 : 18;
      const hour = Math.min(
        23,
        Math.max(0, Math.round(peak + randBetween(rng, -3, 3)))
      );
      const start = new Date(dayStart);
      start.setHours(hour, Math.floor(rng() * 60), 0, 0);
      const durationMin = Math.round(randBetween(rng, 20, 180));
      const end = new Date(start.getTime() + durationMin * 60 * 1000);
      const portType: PortType = rng() > 0.5 ? "DC" : "AC";
      const power = portType === "DC" ? randBetween(rng, 25, 55) : randBetween(rng, 6, 19);
      const energyKwh = +((power * durationMin) / 60).toFixed(2);
      const rate = portType === "DC" ? 0.42 : 0.28;

      sessions.push({
        id: `SESS${String(sessionIdx).padStart(6, "0")}`,
        siteId: site.id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        energyKwh,
        portType,
        plugType: pick(rng, PLUGS),
        connectorType: pick(rng, site.connectorTypes),
        co2SavedKg: +(energyKwh * 0.4).toFixed(2),
        revenue: +(energyKwh * rate).toFixed(2),
        customerId: `C${String(1 + Math.floor(rng() * 1200)).padStart(4, "0")}`,
        durationMin,
      });
    }
  }

  // --- Faults (synthetic — Sprint 3 placeholder data) ---
  const faults: FaultRecord[] = [];
  const faultCount = 60;
  for (let i = 0; i < faultCount; i++) {
    const site = pick(rng, sites);
    const detected = new Date(nowMs - randBetween(rng, 0, 60) * DAY_MS);
    const statusRoll = rng();
    const status: FaultStatus =
      statusRoll > 0.7 ? "open" : statusRoll > 0.45 ? "in_progress" : "resolved";
    const mttrHours = status === "resolved" ? +randBetween(rng, 1, 48).toFixed(1) : null;
    const resolvedAt =
      status === "resolved" && mttrHours
        ? new Date(detected.getTime() + mttrHours * 60 * 60 * 1000).toISOString()
        : null;
    faults.push({
      id: `F${String(i + 1).padStart(4, "0")}`,
      siteId: site.id,
      code: pick(rng, FAULT_CODES),
      severity: pick(rng, SEVERITIES),
      status,
      detectedAt: detected.toISOString(),
      resolvedAt,
      mttrHours,
      description: `${pick(rng, FAULT_CODES)} reported at ${site.name}`,
    });
  }

  return { sites, sessions, faults };
}
