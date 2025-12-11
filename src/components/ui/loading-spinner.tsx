"use client";

/**
 * Loading Spinner Component
 * 
 * A beautiful, animated loading spinner with optional text.
 */

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  text?: string;
  className?: string;
  fullPage?: boolean;
}

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-3",
  xl: "h-16 w-16 border-4",
};

export function LoadingSpinner({ 
  size = "md", 
  text, 
  className,
  fullPage = false 
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-primary border-t-transparent",
          sizeClasses[size]
        )}
      />
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex min-h-[400px] w-full items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}

/**
 * Page Loading Skeleton
 * 
 * A skeleton loader for full page content.
 */
export function PageLoadingSkeleton({ 
  showCards = true,
  showTable = false,
}: { 
  showCards?: boolean;
  showTable?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6 p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-64 bg-muted rounded mt-2" />
        </div>
        <div className="h-10 w-32 bg-muted rounded" />
      </div>

      {/* Cards skeleton */}
      {showCards && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-6">
              <div className="h-4 w-24 bg-muted rounded mb-2" />
              <div className="h-8 w-32 bg-muted rounded" />
              <div className="h-3 w-20 bg-muted rounded mt-2" />
            </div>
          ))}
        </div>
      )}

      {/* Table skeleton */}
      {showTable && (
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b">
            <div className="h-10 w-64 bg-muted rounded" />
          </div>
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-10 flex-1 bg-muted rounded" />
                <div className="h-10 w-24 bg-muted rounded" />
                <div className="h-10 w-24 bg-muted rounded" />
                <div className="h-10 w-24 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Auth Page Loading
 * 
 * A centered spinner for auth pages.
 */
export function AuthLoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

