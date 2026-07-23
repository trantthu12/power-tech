import { Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/layout/DashboardLayout";
import { NetworkOverview } from "@/pages/NetworkOverview";
import { Stations } from "@/pages/Stations";
import { LoadUtilization } from "@/pages/LoadUtilization";
import { PerformanceAnalytics } from "@/pages/PerformanceAnalytics";
import { InfrastructurePlanning } from "@/pages/InfrastructurePlanning";
import { PlaceholderPage } from "@/pages/PlaceholderPage";

export default function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<NetworkOverview />} />
        {/* Same landing as "/", but this URL reveals the city switch. */}
        <Route path="vodap" element={<NetworkOverview />} />
        <Route path="stations" element={<Stations />} />
        <Route path="load-utilization" element={<LoadUtilization />} />
        <Route path="performance" element={<PerformanceAnalytics />} />
        <Route path="infrastructure" element={<InfrastructurePlanning />} />
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
