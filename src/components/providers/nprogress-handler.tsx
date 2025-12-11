"use client";

/**
 * NProgress Handler
 * 
 * Intercepts link clicks to show progress bar on navigation.
 * Must be a separate component to use Suspense boundary.
 */

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";

function NProgressHandlerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    NProgress.done();
  }, [pathname, searchParams]);

  useEffect(() => {
    // Intercept all link clicks
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      
      if (!anchor) return;
      
      const href = anchor.getAttribute("href");
      if (!href) return;
      
      // Skip external links, hash links, and same-page links
      if (
        href.startsWith("http") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        anchor.target === "_blank"
      ) {
        return;
      }
      
      // Skip if modifier keys are pressed (open in new tab)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      
      // Start progress
      NProgress.start();
    };

    // Also handle form submissions
    const handleSubmit = () => {
      NProgress.start();
    };

    document.addEventListener("click", handleClick);
    document.addEventListener("submit", handleSubmit);

    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("submit", handleSubmit);
    };
  }, []);

  return null;
}

export function NProgressHandler() {
  return (
    <Suspense fallback={null}>
      <NProgressHandlerInner />
    </Suspense>
  );
}

