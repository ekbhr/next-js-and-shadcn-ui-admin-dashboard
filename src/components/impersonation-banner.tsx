"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImpersonationBannerProps {
  targetUserEmail: string;
  targetUserName?: string | null;
  adminEmail: string;
}

export function ImpersonationBanner({
  targetUserEmail,
  targetUserName,
  adminEmail,
}: ImpersonationBannerProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStopImpersonation = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/impersonate", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to stop impersonation");
      }

      // Refresh the page to get new session
      router.refresh();
      window.location.href = "/dashboard/admin/users";
    } catch (error) {
      console.error("Error stopping impersonation:", error);
      alert("Failed to stop impersonation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 px-4 py-2 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">
            You are viewing as{" "}
            <strong>{targetUserName || targetUserEmail}</strong>
            {targetUserName && (
              <span className="text-amber-800 ml-1">({targetUserEmail})</span>
            )}
          </span>
          <span className="text-amber-700 text-sm">
            • Logged in as {adminEmail}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleStopImpersonation}
          disabled={loading}
          className="bg-amber-600 hover:bg-amber-700 text-white border-amber-600 hover:border-amber-700"
        >
          {loading ? (
            "Returning..."
          ) : (
            <>
              <X className="mr-1 h-4 w-4" />
              Return to Admin
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

