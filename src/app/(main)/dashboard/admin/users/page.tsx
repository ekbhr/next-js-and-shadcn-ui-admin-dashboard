/**
 * User Management Page
 * 
 * Admin-only page to view users and assign domains.
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { UserManagement } from "./_components/user-management";

export const metadata: Metadata = {
  title: "RevEngine Media - User Management",
};

export default async function UsersPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Admin-only page
  if (!isAdmin(session.user.role)) {
    redirect("/dashboard/unauthorized");
  }

  // Get all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      domainAssignments: {
        where: { isActive: true, domain: { not: null } },
        select: {
          id: true,
          domain: true,
          network: true,
          revShare: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get all unique domains from admin's assignments (available domains)
  const adminDomains = await prisma.domain_Assignment.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
      domain: { not: null },
    },
    select: { domain: true, network: true },
    distinct: ["domain"],
  });

  const availableDomains = adminDomains
    .filter((d) => d.domain !== null)
    .map((d) => ({ domain: d.domain!, network: d.network || "sedo" }));

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          Manage users and assign domains to them
        </p>
      </div>

      {/* User Management Component */}
      <UserManagement users={users} availableDomains={availableDomains} />
    </div>
  );
}

