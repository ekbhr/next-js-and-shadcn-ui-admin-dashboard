"use client";

/**
 * NProgress Provider
 * 
 * Shows a slim progress bar at the top of the page during navigation.
 * Similar to GitHub, YouTube, and Medium.
 */

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";

// Configure NProgress
NProgress.configure({
  showSpinner: false,
  minimum: 0.1,
  speed: 400,
  trickleSpeed: 200,
});

export function NProgressProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    NProgress.done();
  }, [pathname, searchParams]);

  return <>{children}</>;
}

// Hook to manually trigger progress (useful for async operations)
export function useNProgress() {
  return {
    start: () => NProgress.start(),
    done: () => NProgress.done(),
    set: (n: number) => NProgress.set(n),
  };
}

