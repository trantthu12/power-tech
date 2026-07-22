// Dataset built from the REAL City of Boulder EV charging sessions dataset
// (148k sessions aggregated offline into src/data/boulder-data.json by
// scripts/fetch-boulder.mjs). Everything the app shows — stations, sessions,
// energy, CO2, duration, the 24×7 demand pattern, per-station stats — is real.

import type { ConnectorType, Site } from "@/types";
import boulder from "@/data/boulder-data.json";

/** A station plus its real aggregated stats. */
export interface SiteAgg extends Site {
  sessions: number;
  energyKwh: number;
  co2Kg: number;
  /** Gasoline displaced (US gallons) */
  gasolineGal: number;
  avgDurationMin: number;
  /** Charger utilization: active charging time ÷ total plugged-in time (%) */
  utilizationPct: number;
  /** 168 cells: energy (kWh) per dayOfWeek*24 + hour, over the whole dataset */
  heat: number[];
}

export interface DailyTotal {
  date: string;
  sessions: number;
  energyKwh: number;
}

export interface Dataset {
  sites: SiteAgg[];
  heatAll: number[]; // 168, summed across all sites
  dailyTotals: DailyTotal[];
  ratePerKwh: number;
  co2PerKwh: number;
  /** US gallons of gasoline displaced per kWh delivered (real ratio) */
  galPerKwh: number;
  numDays: number;
  totalSessions: number;
  totalEnergyKwh: number;
  totalCo2Kg: number;
  totalGasolineGal: number;
  avgDurationMin: number;
  /** Network-wide charger utilization (%) */
  avgUtilizationPct: number;
  dateEnd: string;
}

interface RawSite {
  id: string;
  name: string;
  address: string;
  city: string;
  zip: string;
  lat: number;
  lng: number;
  connectorTypes: string[];
  numPorts: number;
  sessions: number;
  energyKwh: number;
  co2Kg: number;
  gasolineGal: number;
  avgDurationMin: number;
  utilizationPct: number;
  heat: number[];
}

/** Build the dataset from the baked Boulder aggregates. */
export function buildDataset(): Dataset {
  const raw = boulder as unknown as {
    meta: {
      ratePerKwh: number;
      sessions: number;
      energyKwh: number;
      co2Kg: number;
      gasolineGal: number;
      avgDurationMin: number;
      utilizationPct: number;
      dateEnd: string;
    };
    sites: RawSite[];
    dailyTotals: DailyTotal[];
  };

  const sites: SiteAgg[] = raw.sites.map((s) => ({
    id: s.id,
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    address: s.address,
    city: s.city,
    zip: s.zip,
    connectorTypes: s.connectorTypes as ConnectorType[],
    numPorts: s.numPorts,
    sessions: s.sessions,
    energyKwh: s.energyKwh,
    co2Kg: s.co2Kg,
    gasolineGal: s.gasolineGal,
    avgDurationMin: s.avgDurationMin,
    utilizationPct: s.utilizationPct,
    heat: s.heat,
  }));

  const heatAll = new Array(168).fill(0) as number[];
  for (const s of sites) for (let i = 0; i < 168; i++) heatAll[i] += s.heat[i] ?? 0;

  return {
    sites,
    heatAll,
    dailyTotals: raw.dailyTotals,
    ratePerKwh: raw.meta.ratePerKwh,
    co2PerKwh: raw.meta.energyKwh ? raw.meta.co2Kg / raw.meta.energyKwh : 0.62,
    galPerKwh: raw.meta.energyKwh ? raw.meta.gasolineGal / raw.meta.energyKwh : 0.125,
    numDays: raw.dailyTotals.length,
    totalSessions: raw.meta.sessions,
    totalEnergyKwh: raw.meta.energyKwh,
    totalCo2Kg: raw.meta.co2Kg,
    totalGasolineGal: raw.meta.gasolineGal,
    avgDurationMin: raw.meta.avgDurationMin,
    avgUtilizationPct: raw.meta.utilizationPct,
    dateEnd: raw.meta.dateEnd,
  };
}
