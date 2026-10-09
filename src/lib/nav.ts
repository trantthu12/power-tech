import {
  LayoutDashboard,
  Table2,
  Gauge,
  BarChart3,
  Map,
  Leaf,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Stakeholder audience from the requirements doc */
  audience: string;
  /** Whether the day/week/month time filter actually affects this page */
  hasFilter?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Network Overview",
    path: "/",
    icon: LayoutDashboard,
    audience: "All stakeholders",
    // Time control now lives in the on-page "Over time" section, not the header.
    hasFilter: false,
  },
  {
    label: "Stations",
    path: "/stations",
    icon: Table2,
    audience: "All stakeholders",
  },
  {
    label: "Load Utilization",
    path: "/load-utilization",
    icon: Gauge,
    audience: "Load Manager",
  },
  {
    label: "Performance Analytics",
    path: "/performance",
    icon: BarChart3,
    audience: "All stakeholders",
  },
  {
    label: "Infrastructure Planning",
    path: "/infrastructure",
    icon: Map,
    audience: "Network Planner",
  },
  {
    label: "Sustainability",
    path: "/sustainability",
    icon: Leaf,
    audience: "Executive / ESG Officer",
  },
  {
    label: "Fault Diagnostics",
    path: "/faults",
    icon: AlertTriangle,
    audience: "Operations Manager",
  },
];
