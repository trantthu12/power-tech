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
| **Infrastructure Planning** | Network Planner | ✅ Done (moved up — real public-station data was available) |

**Application shell:** dark sidebar with all pages, header with a Day / Week /
Month time filter, and a fully responsive layout (sidebar collapses to a hamburger
menu on mobile).

### What each Sprint 2 page contains (built on real data)

- **Network Overview** — KPI cards (total stations, charging sessions, total
  energy, CO₂ avoided, gasoline saved), Top Stations by energy, Energy by ZIP,
  a station map, and the time filter.
- **Load Utilization** — 24×7 hourly-demand heatmap with a per-station selector,
  charger-utilization KPI, peak hour and peak load, 48-hour demand forecast
  (projected from the real demand pattern), and a load-optimization panel.
- **Performance Analytics** — KPI trend charts (energy and CO₂ over time), site
  comparison (energy / sessions), and a 24×7 utilization heatmap.
- **Stations** — full station table with search, sorting (energy, sessions, CO₂,
  duration, utilization), pagination, and CSV export.
- **Infrastructure Planning** — the real public-charging landscape of Boulder from
  the Colorado AFDC inventory: KPIs (public stations, ports, DC-fast ports,
  networks, newest-year openings), stations-by-network and connector-type
  breakdowns, an infrastructure-growth chart (2014→present), and a map of all
  public stations coloured by network.

---

## Next Semester — Sprint 3 (planned)

Sprint 3 pages depend on the **inputs that have no data source yet** (fault,
maintenance, capacity, uptime). The plan is to generate **synthetic data** for
these, then build the pages against the same service layer.

| Page | Stakeholder | Needs (Sprint 3 input) |
|------|-------------|------------------------|
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
