import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/layout/DashboardLayout";

// Lazy-load pages so their heavy chart/map libs (recharts, leaflet) load
// per-route instead of all landing in the initial bundle.
const NetworkOverview = lazy(() =>
  import("@/pages/NetworkOverview").then((m) => ({ default: m.NetworkOverview }))
);
const Stations = lazy(() =>
  import("@/pages/Stations").then((m) => ({ default: m.Stations }))
);
const LoadUtilization = lazy(() =>
  import("@/pages/LoadUtilization").then((m) => ({ default: m.LoadUtilization }))
);
const PerformanceAnalytics = lazy(() =>
  import("@/pages/PerformanceAnalytics").then((m) => ({ default: m.PerformanceAnalytics }))
);
const InfrastructurePlanning = lazy(() =>
  import("@/pages/InfrastructurePlanning").then((m) => ({ default: m.InfrastructurePlanning }))
);
const Sustainability = lazy(() =>
  import("@/pages/Sustainability").then((m) => ({ default: m.Sustainability }))
);
const FaultDiagnostics = lazy(() =>
  import("@/pages/FaultDiagnostics").then((m) => ({ default: m.FaultDiagnostics }))
);

// The dashboard's page routes. Rendered twice: once at the root, and once under
// the /vodap prefix, where the city switch is unlocked (see city-context).
function dashboardRoutes() {
  return (
    <>
      <Route index element={<NetworkOverview />} />
      <Route path="stations" element={<Stations />} />
      <Route path="load-utilization" element={<LoadUtilization />} />
      <Route path="performance" element={<PerformanceAnalytics />} />
      <Route path="infrastructure" element={<InfrastructurePlanning />} />
      <Route path="sustainability" element={<Sustainability />} />
      <Route path="faults" element={<FaultDiagnostics />} />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        {/* Normal, Boulder-only routes. */}
        {dashboardRoutes()}
        {/* Same pages under /vodap — this URL space reveals the city switch. */}
        <Route path="vodap">{dashboardRoutes()}</Route>
      </Route>
    </Routes>
  );
}
