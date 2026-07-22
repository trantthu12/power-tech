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
  /** Sprint 2 = built now, Sprint 3 = stub */
  sprint: 2 | 3;
  /** Whether the day/week/month time filter actually affects this page */
  hasFilter?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Network Overview",
    path: "/",
    icon: LayoutDashboard,
    audience: "All stakeholders",
    sprint: 2,
    hasFilter: true,
  },
  {
    label: "Stations",
    path: "/stations",
    icon: Table2,
    audience: "All stakeholders",
    sprint: 2,
  },
  {
    label: "Load Utilization",
    path: "/load-utilization",
    icon: Gauge,
    audience: "Load Manager",
    sprint: 2,
  },
  {
    label: "Performance Analytics",
    path: "/performance",
    icon: BarChart3,
    audience: "All stakeholders",
    sprint: 2,
  },
  {
    label: "Infrastructure Planning",
    path: "/infrastructure",
    icon: Map,
    audience: "Network Planner",
    sprint: 3,
  },
  {
    label: "Sustainability",
    path: "/sustainability",
    icon: Leaf,
    audience: "Executive / ESG Officer",
    sprint: 3,
  },
  {
    label: "Fault Diagnostics",
    path: "/faults",
    icon: AlertTriangle,
    audience: "Operations Manager",
    sprint: 3,
  },
];
