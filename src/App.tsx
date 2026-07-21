import { Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/layout/DashboardLayout";
import { NetworkOverview } from "@/pages/NetworkOverview";
import { PlaceholderPage } from "@/pages/PlaceholderPage";

export default function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<NetworkOverview />} />
        <Route
          path="load-utilization"
          element={
            <PlaceholderPage
              title="Load Utilization"
              audience="Load Manager"
              sprint={2}
              widgets={[
                "24×7 heat map of hourly demand / site",
                "48-hr demand forecast chart",
                "Load optimization panel",
                "Port occupancy rates",
                "Peak hourly usage",
              ]}
            />
          }
        />
        <Route
          path="performance"
          element={
            <PlaceholderPage
              title="Performance Analytics"
              audience="All stakeholders"
              sprint={2}
              widgets={[
                "KPI trend charts (session efficiency, utilization trend)",
                "Site comparison (energy & financial)",
                "Peak demand",
                "Distribution system variations (capacity profiles)",
                "Underutilization tracking",
                "Occupancy per region per day",
              ]}
            />
          }
        />
        <Route
          path="infrastructure"
          element={
            <PlaceholderPage
              title="Infrastructure Planning"
              audience="Network Planner"
              sprint={3}
              widgets={[
                "MCDA ranking",
                "Priority score table",
                "Coverage gap analysis",
                "Short-term demand forecast",
                "Expansion recommendations",
              ]}
            />
          }
        />
        <Route
          path="sustainability"
          element={
            <PlaceholderPage
              title="Sustainability Scoring"
              audience="Executive / ESG Officer"
              sprint={3}
              widgets={[
                "Energy delivered and avoided emissions",
                "Ageing asset flags",
                "CO₂ offset estimate",
                "ESG summary panel",
              ]}
            />
          }
        />
        <Route
          path="faults"
          element={
            <PlaceholderPage
              title="Fault Diagnostics"
              audience="Operations Manager"
              sprint={3}
              widgets={[
                "Risk-ranked alert table",
                "Fault history timeline",
                "Mean Time Between Failures trend",
                "Mean Time To Repair trends",
                "Fault probability",
              ]}
            />
          }
        />
      </Route>
    </Routes>
  );
}
