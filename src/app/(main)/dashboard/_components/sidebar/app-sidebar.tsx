"use client";

import Link from "next/link";

import { Command } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { isAdmin } from "@/lib/roles";
import { sidebarItems, type NavGroup } from "@/navigation/sidebar/sidebar-items";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string;
    email: string;
    avatar: string;
    role: string;
  };
}) {
  // Filter sidebar items based on user role
  const filteredItems: NavGroup[] = sidebarItems
    .filter(group => !group.adminOnly || isAdmin(user.role))
    .map(group => ({
      ...group,
      items: group.items.filter(item => !item.adminOnly || isAdmin(user.role)),
    }))
    .filter(group => group.items.length > 0);

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <Link href="/dashboard">
                <Command />
                <span className="text-base font-semibold">{APP_CONFIG.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
