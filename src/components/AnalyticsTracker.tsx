"use client";

import { useEffect } from "react";

interface AnalyticsTrackerProps {
  page: string;
  title?: string;
}

export function AnalyticsTracker({ page, title }: AnalyticsTrackerProps) {
  useEffect(() => {
    // Only track in production
    if (process.env.NODE_ENV !== "production") {
      console.log("Analytics tracking disabled in development for:", page);
      return;
    }

    const trackPageView = async () => {
      try {
        const domain = window.location.hostname;
        const userAgent = navigator.userAgent;
        const referrer = document.referrer || domain;

        await fetch("/api/analytics/track", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            page,
            domain,
            userAgent,
            referrer,
          }),
        });

        console.log("Page view tracked:", page);
      } catch (error) {
        console.error("Failed to track page view:", error);
      }
    };

    // Track after a short delay to ensure page is fully loaded
    const timer = setTimeout(trackPageView, 1000);

    return () => clearTimeout(timer);
  }, [page, title]);

  // This component doesn't render anything
  return null;
}
