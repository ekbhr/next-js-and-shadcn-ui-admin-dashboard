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
  adminOnly?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
  adminOnly?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
  adminOnly?: boolean; // If true, entire group is admin-only
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
    adminOnly: true, // Only visible to admin users
    items: [
      {
        title: "Domain Assignment",
        url: "/dashboard/admin/domains",
        icon: Globe,
        adminOnly: true,
      },
      {
        title: "Settings",
        url: "/dashboard/admin/settings",
        icon: Settings,
        comingSoon: true,
        adminOnly: true,
      },
    ],
  },
];
