"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface Photo {
  src: string;
  alt: string;
  caption: string;
}

interface PhotoCarouselProps {
  photos: Photo[];
  autoPlay?: boolean;
  interval?: number;
}

export function PhotoCarousel({
  photos,
  autoPlay = true,
  interval = 5000,
}: Readonly<PhotoCarouselProps>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !autoPlay || photos.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
    }, interval);

    return () => clearInterval(timer);
  }, [mounted, autoPlay, interval, photos.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + photos.length) % photos.length,
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
  };

  if (photos.length === 0) {
    return (
      <div className="relative w-full h-96 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">No photos available</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-96 max-w-2xl mx-auto rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
      {/* Main Image */}
      <div className="relative w-full h-full">
        <Image
          src={photos[currentIndex].src}
          alt={photos[currentIndex].alt}
          fill
          className="object-cover transition-opacity duration-500"
          priority={currentIndex === 0}
        />

        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Caption */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <p className="text-white text-lg font-medium drop-shadow-lg">
            {photos[currentIndex].caption}
          </p>
        </div>
      </div>

      {/* Navigation Arrows */}
      {photos.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            aria-label="Previous photo"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            aria-label="Next photo"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {photos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
          {photos.map((photo, index) => (
            <button
              key={`${photo.src}-${index}`}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentIndex
                  ? "bg-white"
                  : "bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`Go to photo ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Photo Counter */}
      {photos.length > 1 && (
        <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 text-white text-sm rounded-full">
          {currentIndex + 1} / {photos.length}
        </div>
      )}
    </div>
  );
}
