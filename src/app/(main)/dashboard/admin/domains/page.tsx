/**
 * Domain Assignment Management Page
 * 
 * Allows admins to:
 * - View all domains
 * - Assign each domain to ONE user
 * - Edit revShare per domain
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { DomainTable } from "./_components/domain-table";

export const metadata: Metadata = {
  title: "RevEngine Media - Domain Management",
};

export default async function DomainsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Admin-only page
  if (!isAdmin(session.user.role)) {
    redirect("/dashboard/unauthorized");
  }

  // Get all domain assignments with user info
  const assignments = await prisma.domain_Assignment.findMany({
    where: { isActive: true },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { domain: "asc" },
  });

  // Get all active users for the dropdown
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: { name: "asc" },
  });

  // Format assignments for the table
  const formattedAssignments = assignments.map((a) => ({
    id: a.id,
    domain: a.domain,
    network: a.network,
    revShare: a.revShare,
    isActive: a.isActive,
    notes: a.notes,
    userId: a.userId,
    userName: a.user.name,
    userEmail: a.user.email,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }));

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Domain Assignment</h1>
        <p className="text-muted-foreground">
          Assign domains to users and set revenue share percentages
        </p>
      </div>

      {/* Domain Table */}
      <DomainTable assignments={formattedAssignments} users={users} />
    </div>
  );
}
