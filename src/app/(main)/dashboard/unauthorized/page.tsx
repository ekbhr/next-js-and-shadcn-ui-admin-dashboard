/**
 * Unauthorized Access Page
 * 
 * Shown when a user tries to access a page they don't have permission for.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ShieldX } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "RevEngine Media - Unauthorized",
};

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="bg-destructive/10 rounded-full p-4">
          <ShieldX className="text-destructive h-12 w-12" />
        </div>
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground max-w-md">
          You don&apos;t have permission to access this page. 
          This section is restricted to administrators only.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  );
}

