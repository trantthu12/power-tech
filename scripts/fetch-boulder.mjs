// One-off: turn the real Boulder open-data EV charging SESSIONS dataset
// (148k rows) into compact baked aggregates for the app, and geocode the 50
// station addresses (the dataset has no coordinates). Run:
//   node scripts/fetch-boulder.mjs
// Writes src/data/boulder-data.json. Re-basing shifts the real 2018-2023 dates
// forward (whole weeks, preserving weekday/hour) so the latest session aligns
// with the app's fixed DEMO_NOW.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const CACHE = resolve(root, "scripts/.boulder-raw.json");
const SRC =
  "https://opendata.arcgis.com/datasets/95992b3938be4622b07f0b05eba95d4c_0.geojson";
const DEMO_NOW_MS = new Date("2026-07-20T12:00:00Z").getTime();
const DAY = 86400000;
const RATE_PER_KWH = 0.3; // simulated tariff (dataset has no revenue)

// --- load raw (cache to avoid re-downloading 80MB) ---
let rawText;
if (existsSync(CACHE)) {
  console.log("Using cached raw dataset");
  rawText = readFileSync(CACHE, "utf8");
} else {
  console.log("Downloading Boulder dataset (~80MB)…");
  const res = await fetch(SRC);
  if (!res.ok) throw new Error(`download ${res.status}`);
  rawText = await res.text();
  writeFileSync(CACHE, rawText);
}
const raw = JSON.parse(rawText);
const feats = raw.features;
console.log(`Parsed ${feats.length} sessions`);

// --- helpers ---
function parseDT(s) {
  // "M/D/YYYY H:mm"
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

// --- first pass: find max start date for re-basing ---
let maxStart = 0;
for (const f of feats) {
  const t = parseDT(f.properties.Start_Date___Time);
  if (t && t.ms > maxStart) maxStart = t.ms;
}
// Shift so the latest session lands exactly on DEMO_NOW (so the recent-window
// filters have data). Hour-of-day is kept from the original timestamp; the
// heatmap uses the original weekday so the real weekly pattern is preserved.
const offset = DEMO_NOW_MS - maxStart;
console.log(`Re-basing by ${(offset / DAY).toFixed(1)} days`);

// --- aggregate ---
const sitesMap = new Map(); // name -> site agg
const daily = new Map(); // date -> {sessions, energy}
let netEnergy = 0,
  netCo2 = 0,
  netDur = 0,
  netSessions = 0;

const usedIds = new Set();
function siteId(name) {
  const base = "BLDR-" + name.replace(/[^A-Za-z0-9]+/g, "").toUpperCase();
  let id = base;
  let n = 2;
  while (usedIds.has(id)) id = `${base}-${n++}`; // guarantee uniqueness
  usedIds.add(id);
  return id;
}

for (const f of feats) {
  const p = f.properties;
  const t = parseDT(p.Start_Date___Time);
  if (!t) continue;
  const energy = parseFloat(p.Energy__kWh_) || 0;
  const co2 = parseFloat(p.GHG_Savings__kg_) || 0;
  const duration = durMin(p.Total_Duration__hh_mm_ss_);
  const dow = new Date(t.ms).getUTCDay();
  const hour = t.hour;

  const name = (p.Station_Name || "Unknown").trim();
  let site = sitesMap.get(name);
  if (!site) {
    site = {
      id: siteId(name),
      name,
      address: (p.Address || "").trim(),
      zip: (p.Zip_Postal_Code || "").trim(),
      sessions: 0,
      energyKwh: 0,
      co2Kg: 0,
      durMin: 0,
      heat: new Array(168).fill(0),
    };
    sitesMap.set(name, site);
  }
  site.sessions++;
  site.energyKwh += energy;
  site.co2Kg += co2;
  site.durMin += duration;
  site.heat[dow * 24 + hour] += energy;

  const dateKey = new Date(t.ms + offset).toISOString().slice(0, 10);
  const dd = daily.get(dateKey) || { sessions: 0, energy: 0 };
  dd.sessions++;
  dd.energy += energy;
  daily.set(dateKey, dd);

  netEnergy += energy;
  netCo2 += co2;
  netDur += duration;
  netSessions++;
}

const sites = [...sitesMap.values()];
console.log(`Aggregated ${sites.length} stations`);

// --- geocode addresses (Nominatim, 1.1s apart, fallback to Boulder + jitter) ---
const BOULDER = [40.015, -105.2705];
async function geocode(addr, i) {
  const q = encodeURIComponent(`${addr}, Boulder, CO, USA`);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`,
      { headers: { "User-Agent": "powertech-demo/1.0 (student project)" } }
    );
    if (res.ok) {
      const j = await res.json();
      if (j[0]) return [parseFloat(j[0].lat), parseFloat(j[0].lon)];
    }
  } catch {
    /* fall through */
  }
  // deterministic jitter around Boulder
  const jx = (((i * 73) % 100) - 50) / 700;
  const jy = (((i * 137) % 100) - 50) / 700;
  return [BOULDER[0] + jy, BOULDER[1] + jx];
}

// Reuse coordinates from a previous run so weekly refreshes don't re-geocode.
const coordCache = new Map();
const prevPath = resolve(root, "src/data/boulder-data.json");
if (existsSync(prevPath)) {
  try {
    for (const s of JSON.parse(readFileSync(prevPath, "utf8")).sites || [])
      if (s.lat && s.lng) coordCache.set(s.name, [s.lat, s.lng]);
  } catch {
    /* ignore */
  }
}

console.log("Resolving coordinates…");
for (let i = 0; i < sites.length; i++) {
  const cached = coordCache.get(sites[i].name);
  const [lat, lng] = cached || (await geocode(sites[i].address, i));
  sites[i].lat = lat;
  sites[i].lng = lng;
  if (!cached) await new Promise((r) => setTimeout(r, 1100));
  if (i % 10 === 0) console.log(`  ${i + 1}/${sites.length}`);
}

// --- shape output ---
const outSites = sites.map((s) => ({
  id: s.id,
  name: s.name,
  address: s.address,
  city: "Boulder",
  zip: s.zip || "—",
  lat: +s.lat.toFixed(5),
  lng: +s.lng.toFixed(5),
  connectorTypes: ["J1772"],
  numPorts: 2,
  sessions: s.sessions,
  energyKwh: Math.round(s.energyKwh),
  co2Kg: Math.round(s.co2Kg),
  avgDurationMin: Math.round(s.durMin / s.sessions),
  heat: s.heat.map((v) => Math.round(v)),
}));

const dailyTotals = [...daily.entries()]
  .map(([date, v]) => ({ date, sessions: v.sessions, energyKwh: Math.round(v.energy) }))
  .sort((a, b) => a.date.localeCompare(b.date));

const out = {
  meta: {
    source: "City of Boulder open data — EV charging sessions",
    ratePerKwh: RATE_PER_KWH,
    sessions: netSessions,
    energyKwh: Math.round(netEnergy),
    co2Kg: Math.round(netCo2),
    avgDurationMin: Math.round(netDur / netSessions),
    dateStart: dailyTotals[0]?.date,
    dateEnd: dailyTotals[dailyTotals.length - 1]?.date,
  },
  sites: outSites,
  dailyTotals,
};

mkdirSync(resolve(root, "src/data"), { recursive: true });
writeFileSync(resolve(root, "src/data/boulder-data.json"), JSON.stringify(out));
console.log(
  `Wrote src/data/boulder-data.json — ${outSites.length} sites, ${dailyTotals.length} days, ${netSessions} sessions`
);
