# Front-End Plan — PowerTech Dashboard

> Requirements: `SEE 799 - Team Powertech_Sprint 2 Block diagram.docx`
> Project overview: `requirements/prd-doc.md`

This plan covers what the front end delivers **this semester (Sprint 2)** and what
is scheduled for **next semester (Sprint 3)**.

---

## This Semester — Sprint 2 (delivered)

Sprint 2 delivers the operational pages that the available **real open data** can
support today, plus the shared application shell.

| Page | Stakeholder | Status |
|------|-------------|--------|
| **Network Overview** (landing) | All stakeholders | ✅ Done |
| **Load Utilization** | Load Manager | ✅ Done |
| **Performance Analytics** | All stakeholders | ✅ Done |
| **Stations** (searchable/sortable station table) | All stakeholders | ✅ Done |

**Application shell:** dark sidebar with all pages, header with a Day / Week /
Month time filter, and a fully responsive layout (sidebar collapses to a hamburger
menu on mobile).

### What each Sprint 2 page contains (built on real data)

- **Network Overview** — KPI cards (total stations, sessions, energy, CO₂
  avoided, gasoline saved, charger utilization), Top 3 Stations per area (ZIP),
  Energy by Area (ZIP), a Charger Types (AC vs DC) breakdown, a station map, and
  the time filter. Includes Sprint-3 holding cards for Uptime/Downtime and
  Faults & Alerts.
- **Load Utilization** — 24×7 hourly-demand heatmap with a per-station selector,
  charger-utilization KPI, peak hour and peak load, a per-station hourly energy
  line chart (multi-select up to 5 stations; legend labelled with ZIP area),
  48-hour demand forecast, a load-optimization panel, and an
  expansion-recommendation table (areas ranked by demand intensity).
- **Performance Analytics** — KPI trend charts (energy and CO₂ over time), site
  comparison (energy / sessions), a 24×7 utilization heatmap, and estimated
  financials (revenue, revenue/session, electricity cost — see revenue note).
- **Stations** — full station table with search, sorting (energy, sessions, CO₂,
  duration, utilization), charger Type (AC/DC), a utilization tooltip,
  pagination, and CSV export.

The Colorado AFDC public-station inventory is also used to power the AC/DC
charger-type breakdown on Network Overview (204 public stations; 9 DC-fast).

---

## Next Semester — Sprint 3 (planned)

Sprint 3 pages depend on the **inputs that have no data source yet** (fault,
maintenance, capacity, uptime). The plan is to generate **synthetic data** for
these, then build the pages against the same service layer.

| Page | Stakeholder | Needs (Sprint 3 input) |
|------|-------------|------------------------|
| **Infrastructure Planning** | Network Planner | MCDA ranking, priority score table, coverage-gap analysis, short-term demand forecast, expansion recommendations — all require the Python Site-Scoring & Optimization (MCDA) model. Page is stubbed with labelled placeholder cards. |
| **Sustainability Scoring** | Executive / ESG Officer | Energy & avoided-emissions rollups, ageing-asset flags, CO₂ offset estimate, ESG summary. Partly derivable from real data; asset age/ESG panels need synthetic asset metadata. |
| **Fault Diagnostics** | Operations Manager | Risk-ranked alert table, fault-history timeline, MTBF/MTTR trends, fault probability — all require fault & maintenance records (synthetic). |

**Backend integration (Sprint 3):** connect the Python ML engine (demand
forecasting, MCDA site scoring, fault-detection model) to the dashboard by
pointing the service layer at the live API. No UI rewrite is required.

> Sprint 3 pages currently exist as placeholder stubs ("coming in Sprint 3") so
> navigation is complete and no fabricated numbers are shown.

---

## Goal-to-Page Mapping

- **Operate & optimize** → Network Overview, Load Utilization, Performance
  Analytics, Stations (Sprint 2).
- **Plan expansion** → Infrastructure Planning (Sprint 2), Sustainability Scoring
  (Sprint 3).
- **Diagnose faults** → Fault Diagnostics (Sprint 3).

---

## Technical Decisions

| Area | Choice | Note |
|------|--------|------|
| Framework | React + Vite + TypeScript (SPA) | Internal dashboard; no SSR needed |
| UI | Tailwind CSS + hand-built components | Full control over the design system |
| Charts | Recharts (line/bar/area) + ECharts (heatmap) | Recharts animation disabled for stable rendering |
| Map | React-Leaflet + OpenStreetMap | Free, no API key |
| Data fetching | TanStack Query + `services/api.ts` | Single swap point for the real backend |
| Data delivery | Static baked JSON aggregates (`src/data/`) | Built offline by ETL scripts; refresh manual or scheduled weekly |
| Revenue | Estimated from the real City of Boulder L2 time tariff on real durations | $1/hr (0–2h), $2.50/hr (2–4h), 4h cap; labelled "estimated" in the UI |

---

## Data Pipeline

- `scripts/fetch-boulder.mjs` — aggregates the ~140k real Boulder charging
  sessions into `src/data/boulder-data.json` (50 stations, daily totals, 24×7
  heatmap per station).
- `scripts/fetch-stations.mjs` — fetches the Colorado AFDC public-station
  inventory into `src/data/boulder-stations.json` (204 stations, networks,
  connectors, growth).
- `npm run refresh-data` runs both; a weekly scheduled job can refresh them
  automatically. The sidebar shows the current "Data as of" date.
