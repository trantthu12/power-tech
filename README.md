# PowerTech EV Charging Operations Dashboard

An operations dashboard for a municipal EV charging network. Built as an SFU
capstone project for **PowerTech**, using **real open data** from the City of
Boulder (Colorado). It turns raw charging session records into network KPIs,
per-station analytics, load/utilization insights, and financial performance
views.

## Live demo

**https://power-tech-dashboard.vercel.app**

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| Build tool | [Vite 6](https://vite.dev/) |
| Hosting / CI | [Vercel](https://vercel.com/) (auto-deploy on push to `main`) |

## Prerequisites

- **Node.js ≥ 20** (LTS recommended)
- **npm** (ships with Node)

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server (hot reload)
npm run dev
```

The app runs at **http://localhost:5173**.

To preview a production build locally:

```bash
npm run build
npm run preview
```

## NPM scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server with hot-module reload. |
| `npm run build` | Type-check (`tsc -b`) and produce an optimized build in `dist/`. |
| `npm run preview` | Serve the built `dist/` locally to sanity-check the production bundle. |
| `npm run lint` | Run ESLint over the project. |
| `npm run refresh-data` | Re-run the ETL scripts to rebuild the baked datasets (see [Data pipeline](#data-pipeline)). |

## Project structure

```
power-tech/
├── public/               # Static assets (logos, favicon)
├── scripts/              # ETL script that fetches + cleans the open data
│   └── fetch-boulder.mjs
├── src/
│   ├── pages/            # One component per route (Network Overview, Stations, …)
│   ├── components/       # Reusable UI (cards, charts, map, KPI tiles)
│   ├── layout/           # App shell: Sidebar, Header, DashboardLayout
│   ├── lib/              # Hooks, contexts, formatting, nav config
│   │   ├── queries.ts        # TanStack Query hooks
│   │   ├── city-context.tsx  # Active-city state
│   │   └── filter-context.tsx# Time-range filter state
│   ├── services/         # Data access layer
│   │   └── api.ts            # Single boundary every page reads through
│   ├── data/             # Baked static dataset (real, cleaned open data)
│   │   └── boulder-data.json
│   ├── types/            # Shared TypeScript types
│   ├── App.tsx           # Route definitions
│   └── main.tsx          # App entry point
├── index.html
└── vite.config.ts
```

**Service-layer boundary.** Every page/component reads data through
`src/services/api.ts` rather than importing JSON directly. This keeps a clean
seam: the static JSON source can later be swapped for a real backend API without
touching any page code.

## Data pipeline

The dashboard ships with **real charging data baked into static JSON** so it
loads instantly and deploys as a pure static site (no backend required).

1. `scripts/fetch-boulder.mjs` downloads the raw open-data feed, cleans and
   aggregates it (per-station, per-ZIP, hourly patterns, energy, CO₂, revenue,
   etc.).
2. The cleaned result is written to `src/data/boulder-data.json`.
3. Run the pipeline with:

   ```bash
   npm run refresh-data
   ```

**Data source & honesty notes**

- Source: City of Boulder open data.
- Revenue is an **estimate** computed from the city's real published L2 time
  tariff applied to real session durations.
- Metrics that need data not yet available (station uptime, faults) are shown as
  clearly-labeled Sprint 3 placeholders rather than fabricated numbers.

## Features

- **Network Overview** — an **"Over time"** section whose range selector
  (30 / 90 days / 12 months) drives the windowed KPIs (sessions, energy, CO₂
  avoided, gasoline saved, charging efficiency) and an energy trend; plus
  all-time views: top stations per area, energy by ZIP, charger-type mix (with
  station count), and a station map.
- **Stations** — searchable, sortable, paginated table of every station with CSV
  export; click a row to drill into that station on Load Utilization.
- **Load Utilization** — hourly demand heatmap, per-station hourly energy (up to
  5 stations), an idle-blocking leaderboard (lowest charging efficiency), a
  48-hour demand forecast, load optimization, and an expansion recommendation.
- **Performance Analytics** — financial KPIs (total revenue, avg revenue per
  session, electricity cost); an **"Over time"** section with energy and
  charging-session (adoption) trends; site comparison; a utilization heatmap; and
  a weekday-vs-weekend hourly profile.
- **Infrastructure Planning · Sustainability · Fault Diagnostics** — Sprint 3
  pages, currently work-in-progress placeholders.

> Widgets that respond to a time control are grouped in a bounded **"Over time"**
> section; everything outside it is all-time (per-station data has no per-day
> breakdown to window).

## Deployment

Hosted on **Vercel**. Every push to the `main` branch triggers an automatic
production deployment. Client-side routing is handled by the SPA rewrite in
`vercel.json`, which serves `index.html` for all paths so deep links (e.g.
`/stations`) resolve correctly.

To build the deployable bundle manually:

```bash
npm run build   # outputs to dist/
```
