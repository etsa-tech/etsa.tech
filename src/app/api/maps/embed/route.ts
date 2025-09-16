import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const zoom = searchParams.get("zoom") || "15";

    if (!address) {
      return NextResponse.json(
        { error: "Address parameter is required" },
        { status: 400 },
      );
    }

    // Determine canonical site URL for referrer semantics.
    // Note: This route does not make an outbound request; the browser will set
    // the Referer header automatically when loading the iframe. If we later
    // switch to a server-side proxy fetch, use this value as the Referer.
    const referer =
      process.env.NEXT_PUBLIC_WEBSITE_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:8888";
    void referer; // keep linter happy until used in a proxy

    // Use keyless embed to avoid exposing secrets in client-visible URLs.
    const embedUrl = `https://www.google.com/maps?output=embed&q=${encodeURIComponent(
      address,
    )}&z=${encodeURIComponent(zoom)}`;

    return NextResponse.json({
      embedUrl,
      address,
      zoom: parseInt(zoom, 10),
    });
  } catch (error) {
    // Minimal, non-sensitive logging
    console.error("Error generating Google Maps embed URL");
    return NextResponse.json(
      { error: "Failed to generate map embed URL" },
      { status: 500 },
    );
  }
}
