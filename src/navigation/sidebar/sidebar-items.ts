import {
  LayoutDashboard,
  PieChart,
  Globe,
  Settings,
  Users,
  BarChart3,
  Network,
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
        title: "Overview",
        url: "/dashboard/admin/report",
        icon: BarChart3,
        adminOnly: true,
      },
      {
        title: "User Management",
        url: "/dashboard/admin/users",
        icon: Users,
        adminOnly: true,
      },
      {
        title: "Domain Assignment",
        url: "/dashboard/admin/domains",
        icon: Globe,
        adminOnly: true,
      },
    ],
  },
  {
    id: 3,
    label: "Network Reports",
    adminOnly: true,
    items: [
      {
        title: "Sedo",
        url: "/dashboard/admin/reports/sedo",
        icon: Network,
        adminOnly: true,
      },
      {
        title: "Yandex",
        url: "/dashboard/admin/reports/yandex",
        icon: Network,
        adminOnly: true,
      },
    ],
  },
  {
    id: 4,
    label: "System",
    adminOnly: true,
    items: [
      {
        title: "Settings",
        url: "/dashboard/admin/settings",
        icon: Settings,
        adminOnly: true,
      },
    ],
  },
];
