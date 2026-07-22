# PowerTech Dashboard — Product Requirements Document (PRD)

> Front-End requirements and overview for the PowerTech EV-charging analytics
> dashboard. Based on `SEE 799 - Team Powertech_Sprint 2 Block diagram.docx`.

---

## 1. Project Context

**PowerTech** is a subsidiary of **BC Hydro** (the electric utility of British
Columbia, Canada). PowerTech assesses and operates **electric-vehicle (EV)
charging stations**.

A PowerTech network is made of many **charging stations** spread across a region.
Each station has one or more **charging ports**. Every time a vehicle plugs in, a
**charging session** is recorded — start/end time, energy delivered (kWh),
avoided emissions, plug type, duration, and so on.

PowerTech needs a **dashboard** to:

1. **Operate and optimize the network** — see which stations are busy or
   under-used, when demand peaks, and how to balance electrical load.
2. **Diagnose operational faults** — detect problems early, cut downtime, and
   understand which stations fail and why.
3. **Plan network expansion** — use real operating data to decide where new
   stations should be built.

The dashboard turns raw charging data into visual insight so each stakeholder can
make data-driven decisions. A Python **backend/ML engine** (separate work stream)
adds forecasting and recommendations on top of the same data.

> **Three goals:** (1) Operate & optimize → (2) Diagnose faults → (3) Plan
> expansion. These map directly onto the six dashboard pages in Section 4.

---

## 2. System Architecture (from the Block Diagram)

Data flows left-to-right through four blocks:

```
[1. INPUT]  →  [2. PRE-PROCESSING]  →  [3. BACKEND: Data Viz & ML Engine]  →  [4. FRONTEND: Dashboard]
  Raw data        ETL (clean)              Analysis + ML models                  Visualization for users
```

### Block 1 — Input (Raw Data)
- **Session Logs:** start & end time, energy (kWh per charge), port type, plug
  type, CO₂, revenue, customer ID.
- **Site Registry:** GPS coordinates, address, ZIP/postal code, date, total
  duration, charging time.
- **Datasets deferred to Sprint 3** (no data source available yet): max power
  capacity (breaker current/voltage), capacity buffer, fault & error records,
  maintenance records, and uptime/visit statistics.

### Block 2 — Pre-Processing (ETL)
Extract → Clean → Transform → Load (Python). Produces a **Clean Unified
Dataset** ready for analysis. Owned by the data/backend team.

### Block 3 — Backend: Data Visualization & ML Engine (Python)
- **Data Analysis:** temporal trends (day/week/month), utilization statistics,
  geographic visualization, seasonal analysis, sessions per day/charger, average
  session duration, charger utilization, utilization heatmap.
- **Demand Forecasting:** hourly charging demand (kWh) for a 24–72 hour horizon,
  site-level forecasts.
- **Site Scoring & Optimization:** MCDA (multi-criteria decision analysis) model,
  load optimizer, sustainability score, coverage-gap map, priority ranking,
  pattern recognition.
- **Fault Detection Model:** 7-day risk horizon, anomaly detection, risk-ranked
  alerts.

### Block 4 — Frontend: Dashboard (this team's scope)
A web application that presents the data to end users. Six pages, each serving a
different stakeholder (Section 4).

---

## 3. Data Sources

The block diagram names **Palo Alto** and **Boulder** as candidate datasets
(open data is used because comparable Canadian open data is not available).

The dashboard is built on the **real City of Boulder EV-charging open dataset**:

- Source: `open-data.bouldercolorado.gov` — dataset
  `95992b3938be4622b07f0b05eba95d4c_0`.
- Content: **~140,000 real charging sessions across 50 city-owned stations**, each
  with station name, address, ZIP, start/end time, duration, **energy (kWh)**,
  **avoided emissions (GHG kg)**, **gasoline displaced (gallons)**, and charging
  time (Level 2).
- A second real dataset powers Infrastructure Planning: the **Colorado
  Alternative Fuels & EV Charging Stations** inventory (U.S. DOE AFDC feed) —
  **204 public stations, 11 networks** across Boulder, with real coordinates,
  port counts, connector types, network operators, and open dates.

> **No fabricated data.** Fields the open datasets do not contain (revenue,
> online/offline status, customer ID, fault records) are **not shown** in the UI.
> They belong to the Sprint 3 inputs and will be added when a data source or
> backend provides them, without changing the interface.

---

## 4. Dashboard Pages, Stakeholders & Widgets

| # | Page | Stakeholder | Widgets (from the block diagram) | Sprint |
|---|------|-------------|----------------------------------|--------|
| 1 | **Network Overview** (landing) | All stakeholders | High-level KPI cards, geographic/station map, system status banner, filter | 2 |
| 2 | **Load Utilization** | Load Manager | 24×7 heatmap of hourly demand per site, 48-hour demand-forecast chart, load-optimization panel, port occupancy rates, peak hourly usage | 2 |
| 3 | **Performance Analytics** | All stakeholders | KPI trend charts (session efficiency, utilization trend), site comparison (energy & financial), peak demand, distribution/capacity profiles, underutilization tracking, occupancy per region | 2 |
| 4 | **Infrastructure Planning** | Network Planner | MCDA ranking, priority score table, coverage-gap analysis, short-term demand forecast, expansion recommendations | 3 |
| 5 | **Sustainability Scoring** | Executive / ESG Officer | Energy delivered & avoided emissions, ageing-asset flags, CO₂ offset estimate, ESG summary panel | 3 |
| 6 | **Fault Diagnostics** | Operations Manager | Risk-ranked alert table, fault-history timeline, MTBF trend, MTTR trends, fault probability | 3 |

*(MTBF = Mean Time Between Failures; MTTR = Mean Time To Repair.)*

---

## 5. Sprint 2 vs Sprint 3 Deliverables

| | **Sprint 2** (this semester) | **Sprint 3** (next semester) |
|---|---|---|
| Data | Real open data available now (Boulder sessions; Colorado AFDC inventory) | Synthetic data for fault / maintenance / capacity (no source yet) |
| Pages | Network Overview, Load Utilization, Performance Analytics | Sustainability Scoring, Fault Diagnostics |
| Note | Infrastructure Planning was delivered **early** because a real public-station dataset (AFDC) was available | Remaining pages need the deferred Sprint-3 inputs |

> **Sprint 2 focuses on the operational pages** that real data can support today.
> Pages that depend on fault/maintenance/capacity data are scheduled for Sprint 3.

---

## 6. Front-End Scope & Technology

The front end does **not** perform ML or heavy computation — that is the Python
backend's role (Blocks 2 & 3). The front end **turns data into clear visuals**
(Block 4): cards, charts, maps, and heatmaps so each stakeholder can act on them.

**Technology stack**
- **React + Vite + TypeScript** — single-page application.
- **Tailwind CSS** — styling (PowerTech green brand, dark sidebar).
- **Recharts** — line / bar / area charts.
- **ECharts** — 24×7 heatmaps.
- **React-Leaflet + OpenStreetMap** — station maps (no API key required).
- **TanStack Query** — data fetching and caching.

**Data & architecture approach**
- The real datasets are aggregated **offline** into compact JSON files
  (`src/data/`) by ETL scripts (`scripts/fetch-boulder.mjs`,
  `scripts/fetch-stations.mjs`) — this is the Pre-Processing block. The browser
  loads small pre-aggregated files instead of hundreds of thousands of raw rows.
- Every page reads data through a **single service layer** (`src/services/api.ts`).
  When the Python backend exposes a live API, only this one file changes — the UI
  stays the same.
- Data can be refreshed **manually** (`npm run refresh-data`) or **automatically**
  via a weekly scheduled job; the sidebar shows the "Data as of" date.

---

## 7. Repository Map

```
src/
├─ pages/              one file per dashboard page
├─ components/         reusable UI (KPI cards, charts, maps, tables)
├─ services/
│  ├─ api.ts           data service layer (swap point for the real backend)
│  └─ mock-data.ts     builds the in-app dataset from the baked aggregates
├─ types/index.ts      data-model types (mirror the backend contract)
├─ lib/                utilities (time filter, formatting, query hooks, nav)
├─ layout/             app shell (sidebar, header)
└─ data/               baked real-data aggregates (Boulder sessions, AFDC stations)
scripts/               ETL scripts that build src/data/*.json
```
