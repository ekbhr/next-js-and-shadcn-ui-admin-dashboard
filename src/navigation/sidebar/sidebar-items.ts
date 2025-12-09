import {
  LayoutDashboard,
  PieChart,
  Globe,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Revenue",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Overview",
        url: "/dashboard/overview",
        icon: PieChart,
      },
    ],
  },
  {
    id: 2,
    label: "Admin",
    items: [
      {
        title: "Domain Assignment",
        url: "/dashboard/admin/domains",
        icon: Globe,
      },
      {
        title: "Settings",
        url: "/dashboard/admin/settings",
        icon: Settings,
        comingSoon: true,
      },
    ],
  },
];
