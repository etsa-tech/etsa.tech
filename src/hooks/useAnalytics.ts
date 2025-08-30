import { useEffect } from "react";
import { usePathname } from "next/navigation";

interface TrackPageViewOptions {
  page?: string;
  title?: string;
  referrer?: string;
}

export function useAnalytics() {
  const pathname = usePathname();

  const trackPageView = async (options: TrackPageViewOptions = {}) => {
    // Only track in production
    if (process.env.NODE_ENV !== "production") {
      console.log("Analytics tracking disabled in development");
      return;
    }

    try {
      const page = options.page || pathname;
      const domain = window.location.hostname;
      const userAgent = navigator.userAgent;
      const referrer = options.referrer || document.referrer || domain;

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

  // Auto-track page views
  useEffect(() => {
    trackPageView();
  }, [pathname]);

  return {
    trackPageView,
  };
}

// Hook specifically for blog posts
export function useBlogAnalytics(slug: string, title?: string) {
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    if (slug) {
      trackPageView({
        page: `/blog/${slug}`,
        title,
      });
    }
  }, [slug, title, trackPageView]);

  return {
    trackPageView,
  };
}
