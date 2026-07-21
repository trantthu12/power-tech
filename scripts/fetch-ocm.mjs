// One-off fetch: pull real charging stations from Open Charge Map (Vancouver / BC)
// and bake them into src/data/ocm-sites.json. Run:  node scripts/fetch-ocm.mjs
// Reads OCM_API_KEY from .env. The key is NOT bundled into the app.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// --- read key from .env ---
const env = readFileSync(resolve(root, ".env"), "utf8");
const key = (env.match(/OCM_API_KEY=(.+)/) || [])[1]?.trim();
if (!key) throw new Error("OCM_API_KEY not found in .env");

// Several Metro Vancouver (BC) city centers, so the network spans real towns.
const ANCHORS = [
  { name: "Vancouver", lat: 49.2827, lng: -123.1207 },
  { name: "Surrey", lat: 49.1913, lng: -122.849 },
  { name: "Richmond", lat: 49.1666, lng: -123.1336 },
  { name: "Burnaby", lat: 49.2488, lng: -122.9805 },
  { name: "Coquitlam", lat: 49.2838, lng: -122.7932 },
  { name: "North Vancouver", lat: 49.32, lng: -123.0724 },
  { name: "Metrotown", lat: 49.2258, lng: -123.0035 },
];

function titleCase(s) {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function mapConnector(title) {
  if (!title) return null;
  const t = title.toLowerCase();
  if (t.includes("chademo")) return "CHAdeMO";
  if (t.includes("ccs") || t.includes("combo")) return "CCS";
  if (
    t.includes("j1772") ||
    t.includes("type 1") ||
    t.includes("type 2") ||
    t.includes("type1") ||
    t.includes("type2") ||
    t.includes("tesla")
  )
    return "J1772";
  return null;
}

// Fetch each anchor and merge (dedupe by OCM ID).
const rawById = new Map();
for (const anchor of ANCHORS) {
  const params = new URLSearchParams({
    output: "json",
    countrycode: "CA",
    latitude: String(anchor.lat),
    longitude: String(anchor.lng),
    distance: "10",
    distanceunit: "KM",
    maxresults: "200",
    key,
  });
  const res = await fetch(`https://api.openchargemap.io/v3/poi/?${params}`);
  if (!res.ok) throw new Error(`OCM ${res.status}: ${await res.text()}`);
  for (const poi of await res.json()) {
    if (poi && poi.ID != null && !rawById.has(poi.ID)) rawById.set(poi.ID, poi);
  }
}
const raw = [...rawById.values()];

const seen = new Set();
const all = [];
for (const poi of raw) {
  const a = poi.AddressInfo;
  if (!a || typeof a.Latitude !== "number" || typeof a.Longitude !== "number") continue;

  const connectors = [
    ...new Set(
      (poi.Connections || [])
        .map((c) => mapConnector(c.ConnectionType && c.ConnectionType.Title))
        .filter(Boolean)
    ),
  ];
  if (connectors.length === 0) connectors.push("J1772");

  const city = titleCase((a.Town || a.StateOrProvince || "Vancouver").trim());
  const name = (a.Title || "Charging Station").trim();
  const dedupeKey = `${name}-${a.Latitude.toFixed(4)}`;
  if (seen.has(dedupeKey)) continue;
  seen.add(dedupeKey);

  all.push({
    id: `OCM${poi.ID}`,
    name,
    lat: a.Latitude,
    lng: a.Longitude,
    address: (a.AddressLine1 || "").trim() || name,
    city,
    zip: (a.Postcode || "").trim() || "—",
    connectorTypes: connectors,
    numPorts: poi.NumberOfPoints || (poi.Connections || []).length || 2,
  });
}

// Keep broad real coverage (so major spots like Metrotown show up) while still
// spreading across cities.
const PER_CITY = 40;
const TARGET = 180;
const grouped = {};
for (const s of all) (grouped[s.city] ||= []).push(s);
// Cities ordered by how many stations they have (most first).
const cities = Object.keys(grouped).sort((a, b) => grouped[b].length - grouped[a].length);
const sites = [];
for (const city of cities) {
  for (const s of grouped[city].slice(0, PER_CITY)) {
    if (sites.length >= TARGET) break;
    sites.push(s);
  }
  if (sites.length >= TARGET) break;
}

mkdirSync(resolve(root, "src/data"), { recursive: true });
writeFileSync(
  resolve(root, "src/data/ocm-sites.json"),
  JSON.stringify(sites, null, 2) + "\n"
);

const byCity = {};
for (const s of sites) byCity[s.city] = (byCity[s.city] || 0) + 1;
console.log(`Wrote ${sites.length} sites to src/data/ocm-sites.json`);
console.log("By city:", byCity);
