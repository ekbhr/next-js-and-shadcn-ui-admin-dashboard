/**
 * User Management Page
 * 
 * Admin-only page to manage users (roles, activate/deactivate).
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

  // Get all users with domain count
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          domainAssignments: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const formattedUsers = users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    domainCount: user._count.domainAssignments,
  }));

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          Manage user roles and account status
        </p>
      </div>

      {/* User Management Component */}
      <UserManagement users={formattedUsers} currentUserId={session.user.id} />
    </div>
  );
}
