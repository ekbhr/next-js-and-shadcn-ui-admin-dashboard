/**
 * Domain Assignment Management Page
 * 
 * Allows admins to view and edit revShare settings per domain.
 */

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDomainAssignments } from "@/lib/revenue-db";
import { DomainTable } from "./_components/domain-table";
import { SyncButton } from "./_components/sync-button";

export default async function DomainsPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/login");
  }

  const assignments = await getDomainAssignments(session.user.id);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Domain Assignment</h1>
          <p className="text-muted-foreground">
            Manage revenue share settings per domain
          </p>
        </div>
        <SyncButton />
      </div>

      {/* Domain Table */}
      <DomainTable assignments={assignments} />
    </div>
  );
}

