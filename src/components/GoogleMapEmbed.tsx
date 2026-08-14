interface GoogleMapEmbedProps {
  address: string;
  zoom?: number;
  className?: string;
  title?: string;
}

export default function GoogleMapEmbed({
  address,
  zoom = 15,
  className = "w-full h-96",
  title = "Location Map",
}: Readonly<GoogleMapEmbedProps>) {
  if (!address) {
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

  // Keyless embed - no API key required, and nothing sensitive to protect
  // behind a server round-trip, so this URL is built directly on render.
  const embedUrl = `https://www.google.com/maps?output=embed&q=${encodeURIComponent(
    address,
  )}&z=${zoom}`;

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
