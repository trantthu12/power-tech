// One-off: turn the real NYC Open Data "EV Charging Data — Municipal Lots and
// Garages" SESSIONS dataset (~250k rows) into compact baked aggregates. Run:
//   node scripts/fetch-nyc.mjs
// Writes src/data/new-york-data.json with REAL calendar dates (2021 – 2026).
//
// The raw dataset names the same physical facility several different ways
// (e.g. "QBO - Queens Borough Hall…", "Queens Borough Hall…", "Queensboro
// Hall"). We canonicalize those variants into the ~11 real municipal facilities
// so sessions aren't double-counted and station ids don't collide.
//
// Honesty notes: energy, durations, session counts and driver IDs are REAL.
// The dataset does NOT publish CO2/gasoline savings, a price, or coordinates —
// CO2/gasoline/revenue are ESTIMATED from energy, and each facility's
// coordinates/borough are curated (neighborhood-accurate, approximate).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const CACHE = resolve(root, "scripts/.nyc-raw.csv");
const SRC = "https://data.cityofnewyork.us/resource/kj7g-u4gp.csv?$limit=300000";

// Estimation factors (energy → savings/revenue), matching the empirical ratios
// in the real City of Boulder dataset.
const CO2_PER_KWH = 0.622; // kg CO2 avoided per kWh
const GAL_PER_KWH = 0.1255; // US gallons of gasoline displaced per kWh
const RATE_PER_KWH = 0.25; // flat $/kWh estimate (NYC price not in dataset)

// Canonical municipal facilities. Coordinates are neighborhood-accurate
// (approximate); the "area" shown in the dashboard is the borough.
const FACILITIES = {
  QBO: { name: "Queens Borough Hall Municipal Garage", borough: "Queens", lat: 40.7069, lng: -73.8296 },
  CSQ: { name: "Court Square Municipal Garage", borough: "Queens", lat: 40.747, lng: -73.9445 },
  DES: { name: "Delancey & Essex Municipal Garage", borough: "Manhattan", lat: 40.7185, lng: -73.988 },
  JGU: { name: "Jerome / Gun Hill Road Municipal Garage", borough: "Bronx", lat: 40.877, lng: -73.88 },
  J190: { name: "Jerome / 190th Street Municipal Garage", borough: "Bronx", lat: 40.8626, lng: -73.901 },
  BRI: { name: "Bay Ridge Municipal Garage", borough: "Brooklyn", lat: 40.635, lng: -74.023 },
  SGE: { name: "St. George Courthouse Municipal Garage", borough: "Staten Island", lat: 40.643, lng: -74.076 },
  QFA: { name: "Queens Family Court Municipal Garage", borough: "Queens", lat: 40.702, lng: -73.8 },
  STW: { name: "Steinway Municipal Parking Field", borough: "Queens", lat: 40.762, lng: -73.906 },
  CPO: { name: "College Point Municipal Parking Field", borough: "Queens", lat: 40.786, lng: -73.843 },
  HPO: { name: "Hunts Point Municipal Parking Field", borough: "Bronx", lat: 40.811, lng: -73.884 },
};

// Map any raw location string to a canonical facility key (order matters —
// check specific keywords before generic ones).
function canonical(loc) {
  const s = loc.toLowerCase();
  if (s.includes("family court")) return "QFA";
  if (s.includes("queens borough hall") || s.includes("queensboro")) return "QBO";
  if (s.includes("court square")) return "CSQ";
  if (s.includes("delancey")) return "DES";
  if (s.includes("gun hill")) return "JGU";
  if (s.includes("190th")) return "J190";
  if (s.includes("bay ridge")) return "BRI";
  if (s.includes("st. george") || s.includes("st george")) return "SGE";
  if (s.includes("steinway")) return "STW";
  if (s.includes("college point")) return "CPO";
  if (s.includes("hunts point")) return "HPO";
  return null; // "N/A" and anything unrecognized
}

// --- load raw CSV (cache to avoid re-downloading ~56MB) ---
let csv;
if (existsSync(CACHE)) {
  console.log("Using cached raw dataset");
  csv = readFileSync(CACHE, "utf8");
} else {
  console.log("Downloading NYC dataset (~56MB)…");
  const res = await fetch(SRC);
  if (!res.ok) throw new Error(`download ${res.status}`);
  csv = await res.text();
  writeFileSync(CACHE, csv);
}

// --- CSV parsing (all fields double-quoted; handles embedded commas/quotes) ---
function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const lines = csv.split(/\r?\n/);
const header = splitCsvLine(lines[0]);
const IDX = Object.fromEntries(header.map((h, i) => [h, i]));
console.log(`Parsed header; ${lines.length - 1} rows`);

// --- aggregate (one site per canonical facility) ---
const sitesMap = new Map();
const daily = new Map();
const drivers = new Set();
let netEnergy = 0, netCo2 = 0, netDur = 0, netCharge = 0,
  netGasoline = 0, netRevenue = 0, netSessions = 0, skipped = 0;

for (let i = 1; i < lines.length; i++) {
  if (!lines[i]) continue;
  const r = splitCsvLine(lines[i]);
  const date = (r[IDX.date] || "").slice(0, 10);
  if (!date) continue;
  const key = canonical((r[IDX.location_name] || "").trim());
  if (!key) { skipped++; continue; }
  const energy = parseFloat(r[IDX.energy_provided_kwh]) || 0;
  const charge = parseFloat(r[IDX.charge_duration_min]) || 0;
  const conn = parseFloat(r[IDX.connected_duration_min]) || 0;
  if (energy < 0 || conn < 0) continue;
  const hour = parseInt((r[IDX.connected_time] || "0").split(":")[0], 10) || 0;
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  const box = (r[IDX.charge_box_id] || "").trim();
  const driver = (r[IDX.driver_id] || "").trim();
  if (driver) drivers.add(driver);

  let site = sitesMap.get(key);
  if (!site) {
    const f = FACILITIES[key];
    site = {
      id: `NYC-${key}`, name: f.name, borough: f.borough, lat: f.lat, lng: f.lng,
      boxes: new Set(),
      sessions: 0, energyKwh: 0, co2Kg: 0, gasolineGal: 0,
      revenue: 0, durMin: 0, chargeMin: 0,
      heat: new Array(168).fill(0),
    };
    sitesMap.set(key, site);
  }
  const co2 = energy * CO2_PER_KWH;
  const gasoline = energy * GAL_PER_KWH;
  const revenue = energy * RATE_PER_KWH;
  if (box) site.boxes.add(box);
  site.sessions++;
  site.energyKwh += energy;
  site.co2Kg += co2;
  site.gasolineGal += gasoline;
  site.revenue += revenue;
  site.durMin += conn;
  site.chargeMin += charge;
  site.heat[dow * 24 + hour] += energy;

  const dd = daily.get(date) || { sessions: 0, energy: 0, charge: 0, dur: 0 };
  dd.sessions++;
  dd.energy += energy;
  dd.charge += charge;
  dd.dur += conn;
  daily.set(date, dd);

  netEnergy += energy;
  netCo2 += co2;
  netDur += conn;
  netCharge += charge;
  netGasoline += gasoline;
  netRevenue += revenue;
  netSessions++;
}

const sites = [...sitesMap.values()];
console.log(`Aggregated ${sites.length} facilities, ${netSessions} sessions, ${drivers.size} drivers (skipped ${skipped} unrecognized)`);

// --- shape output (area = borough; NYC has no per-station ZIP in the feed) ---
const outSites = sites.map((s) => ({
  id: s.id,
  name: s.name,
  address: `${s.name}, ${s.borough}`,
  city: "New York",
  zip: s.borough,
  lat: +s.lat.toFixed(5),
  lng: +s.lng.toFixed(5),
  connectorTypes: ["J1772"],
  numPorts: s.boxes.size || 1,
  sessions: s.sessions,
  energyKwh: Math.round(s.energyKwh),
  co2Kg: Math.round(s.co2Kg),
  gasolineGal: Math.round(s.gasolineGal),
  revenue: Math.round(s.revenue),
  avgDurationMin: Math.round(s.durMin / s.sessions),
  utilizationPct: s.durMin ? Math.round((100 * s.chargeMin) / s.durMin) : 0,
  heat: s.heat.map((v) => Math.round(v)),
}));

const dailyTotals = [...daily.entries()]
  .map(([date, v]) => ({
    date,
    sessions: v.sessions,
    energyKwh: Math.round(v.energy),
    chargeMin: Math.round(v.charge),
    durMin: Math.round(v.dur),
  }))
  .sort((a, b) => a.date.localeCompare(b.date));

const out = {
  meta: {
    source: "NYC Open Data — Municipal EV charging (CO₂/gasoline/revenue estimated; coords approximate)",
    ratePerKwh: RATE_PER_KWH,
    revenueModel: "Estimated at $0.25/kWh (NYC municipal pricing not in dataset)",
    sessions: netSessions,
    energyKwh: Math.round(netEnergy),
    co2Kg: Math.round(netCo2),
    gasolineGal: Math.round(netGasoline),
    revenue: Math.round(netRevenue),
    uniqueDrivers: drivers.size,
    avgDurationMin: Math.round(netDur / netSessions),
    utilizationPct: netDur ? Math.round((100 * netCharge) / netDur) : 0,
    dateStart: dailyTotals[0]?.date,
    dateEnd: dailyTotals[dailyTotals.length - 1]?.date,
  },
  sites: outSites,
  dailyTotals,
};

mkdirSync(resolve(root, "src/data"), { recursive: true });
writeFileSync(resolve(root, "src/data/new-york-data.json"), JSON.stringify(out));
console.log(
  `Wrote src/data/new-york-data.json — ${outSites.length} sites, ${dailyTotals.length} days, ${netSessions} sessions, ${drivers.size} drivers`
);
