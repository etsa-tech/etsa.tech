"use client";

import { useState, useEffect } from "react";

interface GoogleMapEmbedProps {
  address: string;
  zoom?: number;
  className?: string;
  title?: string;
}

interface MapEmbedResponse {
  embedUrl: string;
  address: string;
  zoom: number;
}

export default function GoogleMapEmbed({
  address,
  zoom = 15,
  className = "w-full h-96",
  title = "Location Map",
}: Readonly<GoogleMapEmbedProps>) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMapEmbed = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/maps/embed?address=${encodeURIComponent(address)}&zoom=${zoom}`,
        );

        if (!response.ok) {
          throw new Error("Failed to load map");
        }

        const data: MapEmbedResponse = await response.json();
        setEmbedUrl(data.embedUrl);
      } catch (err) {
        console.error("Error loading Google Maps embed:", err);
        setError("Failed to load map. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (address) {
      fetchMapEmbed();
    }
  }, [address, zoom]);

  if (loading) {
    return (
      <div
        className={`${className} bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center`}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-etsa-primary mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Loading map...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`${className} bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center`}
      >
        <div className="text-center p-4">
          <svg
            className="w-12 h-12 text-gray-400 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{error}</p>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              address,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center mt-2 text-etsa-primary hover:text-etsa-secondary transition-colors text-sm"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            Open in Google Maps
          </a>
        </div>
      </div>
    );
  }

  if (!embedUrl) {
    return (
      <div
        className={`${className} bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center`}
      >
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Map not available
        </p>
      </div>
    );
  }

  return (
    <div
      className={`${className} bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden`}
    >
      <iframe
        src={embedUrl}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={title}
      />
    </div>
  );
}
