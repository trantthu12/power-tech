// Fetch the REAL public EV-charging station inventory for Boulder, CO from the
// Colorado open-data portal (US DOE Alternative Fuels Data Center feed) and bake
// compact aggregates for the Infrastructure Planning page. Run:
//   node scripts/fetch-stations.mjs
// Writes src/data/boulder-stations.json. This is a small JSON API (no key, ~204
// rows) so — unlike the 80MB sessions file — it is fetched fresh every run.
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const SRC =
  "https://data.colorado.gov/resource/team-3ugz.json?city=Boulder&fuel_type_code=ELEC&$limit=2000";

console.log("Fetching Boulder public station inventory…");
const res = await fetch(SRC, { headers: { "User-Agent": "powertech-demo/1.0" } });
if (!res.ok) throw new Error(`download ${res.status}`);
const raw = await res.json();
console.log(`Fetched ${raw.length} public stations`);

// Normalise the raw connector string ("J1772", "J1772 TESLA", "J1772COMBO"…)
// into the app's canonical connector names.
const CONNECTOR_MAP = {
  J1772: "J1772",
  J1772COMBO: "CCS",
  COMBO: "CCS",
  CHADEMO: "CHAdeMO",
  TESLA: "Tesla",
  NEMA515: "NEMA 5-15",
  NEMA520: "NEMA 5-20",
  NEMA1450: "NEMA 14-50",
};
function connectors(s) {
  return [...new Set((s || "").trim().split(/\s+/).filter(Boolean).map((t) => CONNECTOR_MAP[t] || t))];
}

const stations = raw
  .filter((c) => c.latitude && c.longitude)
  .map((c) => ({
    id: c.id,
    name: (c.station_name || "").trim(),
    network: (c.ev_network || "Non-Networked").replace(/ Network$/, ""),
    address: (c.street_address || "").trim(),
    zip: (c.zip || "").trim(),
    lat: +(+c.latitude).toFixed(5),
    lng: +(+c.longitude).toFixed(5),
    l2: +(c.ev_level2_evse_num || 0),
    dcfc: +(c.ev_dc_fast_num || 0),
    connectors: connectors(c.ev_connector_types),
    openYear: c.open_date ? +c.open_date.slice(0, 4) : null,
  }));

// --- aggregates ---
const bump = (map, key, ports = 0) => {
  const cur = map.get(key) || { stations: 0, ports: 0 };
  cur.stations++;
  cur.ports += ports;
  map.set(key, cur);
};

const netMap = new Map();
const connMap = new Map();
const yearMap = new Map();
let l2Ports = 0;
let dcFastPorts = 0;

for (const s of stations) {
  bump(netMap, s.network, s.l2 + s.dcfc);
  for (const c of s.connectors) bump(connMap, c);
  if (s.openYear) yearMap.set(s.openYear, (yearMap.get(s.openYear) || 0) + 1);
  l2Ports += s.l2;
  dcFastPorts += s.dcfc;
}

const byNetwork = [...netMap.entries()]
  .map(([network, v]) => ({ network, stations: v.stations, ports: v.ports }))
  .sort((a, b) => b.stations - a.stations);

const byConnector = [...connMap.entries()]
  .map(([connector, v]) => ({ connector, stations: v.stations }))
  .sort((a, b) => b.stations - a.stations);

// Cumulative infrastructure growth by year.
const years = [...yearMap.keys()].sort((a, b) => a - b);
let running = 0;
const growth = [];
for (let y = years[0]; y <= years[years.length - 1]; y++) {
  running += yearMap.get(y) || 0;
  growth.push({ year: y, opened: yearMap.get(y) || 0, cumulative: running });
}

const out = {
  meta: {
    source: "Colorado open data — Alternative Fuels & EV Charging Stations (US DOE AFDC)",
    total: stations.length,
    l2Ports,
    dcFastPorts,
    networks: byNetwork.length,
    newestYear: years[years.length - 1],
    newestYearCount: yearMap.get(years[years.length - 1]) || 0,
  },
  byNetwork,
  byConnector,
  growth,
  stations,
};

mkdirSync(resolve(root, "src/data"), { recursive: true });
writeFileSync(resolve(root, "src/data/boulder-stations.json"), JSON.stringify(out));
console.log(
  `Wrote src/data/boulder-stations.json — ${stations.length} stations, ${l2Ports} L2 ports, ${byNetwork.length} networks`
);
