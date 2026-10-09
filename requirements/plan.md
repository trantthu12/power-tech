# Front-End Plan — PowerTech Dashboard

> Requirements: `SEE 799 - Team Powertech_Sprint 2 Block diagram.docx`
> Project overview: `requirements/prd-doc.md`

This plan covers what the front end delivers **this semester (Sprint 2)** and what
is scheduled for **next semester (Sprint 3)**.

**One city.** The dashboard ships **Boulder** only. The selected city still lives
in a React context and is part of every query key, so another city can be added
later without touching the pages; the header switch stays hidden while only one
city is configured.

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

The Charger Types (AC/DC) card on Network Overview reflects the operated fleet:
all 44 stations are Level 2 (AC); DC fast is a Sprint 3 expansion item. (The
Colorado AFDC public-station inventory is kept for the Sprint 3 Infrastructure
Planning page.)

---

## Sprint 3 Pages

These pages read `src/data/boulder-ops.json`, exported from the team's synthetic
dataset workbook. Real session data and synthetic infrastructure / maintenance /
telemetry data are labelled separately on every card.

| Page | Stakeholder | Status |
|------|-------------|--------|
| **Infrastructure Planning** | Network Planner | ✅ Built. MCDA ranking and priority table use an interim in-browser model (weights shown on the page) until the Python MCDA engine is available. |
| **Sustainability Scoring** | Executive / ESG Officer | ✅ Built. Energy/CO₂ roll-ups are real; ageing-asset flags use synthetic install dates. |
| **Fault Diagnostics** | Operations Manager | ✅ Built. Fault probabilities come from the FR-02 LightGBM model (7-day horizon). On 2022–2023 it scores ROC-AUC 0.71, precision 5%, recall 75%, below the FR-02 targets for AUC and precision. |

**Backend integration (Sprint 3):** connect the Python ML engine (demand
forecasting, MCDA site scoring, fault-detection model) to the dashboard by
pointing the service layer at the live API. No UI rewrite is required.

> Synthetic figures carry a "synthetic" badge; model and forecast outputs carry
> "model" / "forecast", so no synthetic number is presented as real.

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
| Data delivery | Static baked JSON aggregates (`src/data/`) | Built offline by ETL scripts; refreshed manually |
| Revenue | Estimated from the real City of Boulder L2 time tariff on real durations | $1/hr (0–2h), $2.50/hr (2–4h), 4h cap; labelled "estimated" in the UI |

---

## Data Pipeline

- `src/data/boulder-data.json` — the curated Boulder dataset (v3): ~78k unique
  sessions from the 148k-row raw feed, 44 stations / 86 ports, renamed chargers
  counted once under their current name, daily totals and a 24×7 heatmap per
  station.
- `src/data/boulder-ops.json` — ports, maintenance events, monthly reliability,
  FR-02 fault probabilities, sustainability roll-ups and planning metrics.
- Both files are exported from `PowerTech_synthetic_dataset.xlsx` by
  `scripts/export_dashboard_json.py` and `scripts/export_ops_json.py` (see the
  README). There is no scheduled refresh. The sidebar shows the current "Data as of" date.
