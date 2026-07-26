# PowerTech EV Charging Operations Dashboard

An operations dashboard for a municipal EV charging network. Built as an SFU
capstone project for **PowerTech**, using **real open data** from the City of
Boulder (Colorado) and the City of Palo Alto (California). It turns raw charging
session records into network KPIs, per-station analytics, load/utilization
insights, and financial performance views.

## Live demo

**https://power-tech-dashboard.vercel.app**

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| Build tool | [Vite 6](https://vite.dev/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| Routing | [React Router 7](https://reactrouter.com/) |
| Data layer | [TanStack Query 5](https://tanstack.com/query) |
| Charts | [Recharts](https://recharts.org/) + [Apache ECharts](https://echarts.apache.org/) |
| Maps | [React Leaflet](https://react-leaflet.js.org/) + [OpenStreetMap](https://www.openstreetmap.org/) tiles |
| Icons | [lucide-react](https://lucide.dev/) |
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
├── scripts/              # ETL scripts that fetch + clean the open data
│   ├── fetch-boulder.mjs
│   └── fetch-paloalto.mjs
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
│   ├── data/             # Baked static datasets (real, cleaned open data)
│   │   ├── boulder-data.json
│   │   └── palo-alto-data.json
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

1. `scripts/fetch-boulder.mjs` and `scripts/fetch-paloalto.mjs` download the raw
   open-data feeds, clean and aggregate them (per-station, per-ZIP, hourly
   patterns, energy, CO₂, revenue, etc.).
2. The cleaned result is written to `src/data/boulder-data.json` and
   `src/data/palo-alto-data.json`.
3. Run the whole pipeline with:

   ```bash
   npm run refresh-data
   ```

**Data sources & honesty notes**

- **Boulder** — City of Boulder open data. Revenue is an **estimate** computed
  from the city's real published L2 time tariff applied to real session
  durations.
- **Palo Alto** — City of Palo Alto open data. Revenue uses the **real billed
  fee** recorded in the dataset.
- Metrics that need data not yet available (station uptime, faults) are shown as
  clearly-labeled Sprint 3 placeholders rather than fabricated numbers.

## Features

- **Network Overview** — headline KPIs (stations, sessions, energy, CO₂ avoided,
  gasoline saved, charging efficiency), top stations per area, energy by ZIP,
  charger-type mix, and a station map.
- **Stations** — searchable, sortable, paginated table of every station with
  CSV export.
- **Load Utilization** — hourly demand heatmap, per-station hourly energy (up to
  5 stations), 48-hour demand forecast, load optimization, and an expansion
  recommendation.
- **Performance Analytics** — financial view: total revenue, average revenue per
  session, electricity cost, and (Palo Alto) driver metrics.
- **Infrastructure Planning · Sustainability · Fault Diagnostics** — Sprint 3
  pages, currently work-in-progress placeholders.

## Deployment

Hosted on **Vercel**. Every push to the `main` branch triggers an automatic
production deployment. Client-side routing is handled by the SPA rewrite in
`vercel.json`, which serves `index.html` for all paths so deep links (e.g.
`/stations`) resolve correctly.

To build the deployable bundle manually:

```bash
npm run build   # outputs to dist/
```
