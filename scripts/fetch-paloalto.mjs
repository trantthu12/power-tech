// Turn the REAL City of Palo Alto EV charging usage dataset (259k sessions,
// ChargePoint, 2011-2020) into compact baked aggregates, in the SAME shape as
// boulder-data.json. Unlike Boulder, Palo Alto includes real per-session Fee
// (revenue) and real Latitude/Longitude, so there is no revenue estimation and
// no geocoding. Run:  node scripts/fetch-paloalto.mjs  ->  src/data/palo-alto-data.json
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const CACHE = resolve(root, "scripts/.paloalto-raw.csv");
const SRC =
  "https://data.paloalto.gov/datasets/194693-electric-vehicle-charging-station-usage-july-2011-dec-2020.download/";
const DEMO_NOW_MS = new Date("2026-07-20T12:00:00Z").getTime();
const DAY = 86400000;

// --- load raw CSV (cache to avoid re-downloading ~81MB) ---
let text;
if (existsSync(CACHE)) {
  console.log("Using cached raw dataset");
  text = readFileSync(CACHE, "utf8");
} else {
  console.log("Downloading Palo Alto dataset (~81MB)…");
  const res = await fetch(SRC);
  if (!res.ok) throw new Error(`download ${res.status}`);
  text = await res.text();
  writeFileSync(CACHE, text);
}
if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM

// --- quote-aware CSV line splitter (handles commas inside quotes) ---
function splitCsv(line) {
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

const lines = text.split(/\r?\n/);
const header = splitCsv(lines[0]);
const col = (name) => header.indexOf(name);
const IDX = {
  name: col("Station Name"),
  start: col("Start Date"),
  dur: col("Total Duration (hh:mm:ss)"),
  charge: col("Charging Time (hh:mm:ss)"),
  energy: col("Energy (kWh)"),
  co2: col("GHG Savings (kg)"),
  gas: col("Gasoline Savings (gallons)"),
  addr: col("Address 1"),
  zip: col("Postal Code"),
  lat: col("Latitude"),
  lng: col("Longitude"),
  fee: col("Fee"),
  user: col("User ID"),
};
for (const [k, v] of Object.entries(IDX))
  if (v < 0) throw new Error(`missing column for ${k}`);

// --- helpers (Palo Alto uses the same "M/D/YYYY H:mm" + "hh:mm:ss" formats) ---
function parseDT(s) {
  if (!s) return null;
  const [datePart, timePart = "0:0"] = s.trim().split(" ");
  const [m, d, y] = datePart.split("/").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  if (!y || !m || !d) return null;
  return { ms: Date.UTC(y, m - 1, d, hh || 0, mm || 0), hour: hh || 0 };
}
function durMin(s) {
  if (!s) return 0;
  const [h = 0, m = 0] = s.split(":").map(Number);
  return h * 60 + m;
}

// --- first pass: latest start date (for re-basing to DEMO_NOW) ---
let maxStart = 0;
for (let i = 1; i < lines.length; i++) {
  if (!lines[i]) continue;
  const t = parseDT(splitCsv(lines[i])[IDX.start]);
  if (t && t.ms > maxStart) maxStart = t.ms;
}
const offset = DEMO_NOW_MS - maxStart;
console.log(`Parsed header; re-basing by ${(offset / DAY).toFixed(1)} days`);

// --- aggregate ---
const sitesMap = new Map();
const daily = new Map();
let netEnergy = 0, netCo2 = 0, netDur = 0, netCharge = 0, netGasoline = 0,
  netRevenue = 0, netSessions = 0;
const drivers = new Set(); // unique User IDs (Palo Alto only)

const usedIds = new Set();
function siteId(name) {
  const base = "PALO-" + name.replace(/[^A-Za-z0-9]+/g, "").toUpperCase();
  let id = base, n = 2;
  while (usedIds.has(id)) id = `${base}-${n++}`;
  usedIds.add(id);
  return id;
}

for (let i = 1; i < lines.length; i++) {
  if (!lines[i]) continue;
  const r = splitCsv(lines[i]);
  const t = parseDT(r[IDX.start]);
  if (!t) continue;
  const energy = parseFloat(r[IDX.energy]) || 0;
  const co2 = parseFloat(r[IDX.co2]) || 0;
  const gasoline = parseFloat(r[IDX.gas]) || 0;
  const fee = parseFloat(r[IDX.fee]) || 0;
  const duration = durMin(r[IDX.dur]);
  const charging = durMin(r[IDX.charge]);
  const dow = new Date(t.ms).getUTCDay();
  const hour = t.hour;

  const name = (r[IDX.name] || "Unknown").trim();
  let site = sitesMap.get(name);
  if (!site) {
    site = {
      id: siteId(name),
      name,
      address: (r[IDX.addr] || "").trim(),
      zip: (r[IDX.zip] || "").trim(),
      lat: parseFloat(r[IDX.lat]) || null,
      lng: parseFloat(r[IDX.lng]) || null,
      sessions: 0, energyKwh: 0, co2Kg: 0, gasolineGal: 0, revenue: 0,
      durMin: 0, chargeMin: 0, heat: new Array(168).fill(0),
    };
    sitesMap.set(name, site);
  }
  if ((!site.lat || !site.lng) && r[IDX.lat] && r[IDX.lng]) {
    site.lat = parseFloat(r[IDX.lat]);
    site.lng = parseFloat(r[IDX.lng]);
  }
  site.sessions++;
  site.energyKwh += energy;
  site.co2Kg += co2;
  site.gasolineGal += gasoline;
  site.revenue += fee;
  site.durMin += duration;
  site.chargeMin += charging;
  site.heat[dow * 24 + hour] += energy;

  const dateKey = new Date(t.ms + offset).toISOString().slice(0, 10);
  const dd = daily.get(dateKey) || { sessions: 0, energy: 0 };
  dd.sessions++;
  dd.energy += energy;
  daily.set(dateKey, dd);

  const uid = (r[IDX.user] || "").trim();
  if (uid) drivers.add(uid);
  netEnergy += energy; netCo2 += co2; netDur += duration; netCharge += charging;
  netGasoline += gasoline; netRevenue += fee; netSessions++;
}

const sites = [...sitesMap.values()].filter((s) => s.lat && s.lng);
console.log(`Aggregated ${sites.length} stations, ${netSessions} sessions`);

// --- shape output (identical to boulder-data.json) ---
const outSites = sites.map((s) => ({
  id: s.id,
  name: s.name,
  address: s.address,
  city: "Palo Alto",
  zip: s.zip || "—",
  lat: +s.lat.toFixed(5),
  lng: +s.lng.toFixed(5),
  connectorTypes: ["J1772"], // Palo Alto is all AC (J1772 + a little NEMA)
  numPorts: 2,
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
  .map(([date, v]) => ({ date, sessions: v.sessions, energyKwh: Math.round(v.energy) }))
  .sort((a, b) => a.date.localeCompare(b.date));

const out = {
  meta: {
    source: "City of Palo Alto open data — EV charging sessions (ChargePoint)",
    ratePerKwh: 0,
    revenueModel: "Real billed fees from the City of Palo Alto ChargePoint dataset",
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
writeFileSync(resolve(root, "src/data/palo-alto-data.json"), JSON.stringify(out));
console.log(
  `Wrote src/data/palo-alto-data.json — ${outSites.length} sites, ${dailyTotals.length} days, ${netSessions} sessions, revenue $${Math.round(netRevenue)}`
);
