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

    // Get the private Google Maps API key
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error("GOOGLE_MAPS_API_KEY environment variable is not set");
      return NextResponse.json(
        { error: "Google Maps API key not configured" },
        { status: 500 },
      );
    }

    // Construct the Google Maps Embed URL
    const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(
      address,
    )}&zoom=${zoom}`;

    // Return the embed URL
    return NextResponse.json({
      embedUrl,
      address,
      zoom: parseInt(zoom),
    });
  } catch (error) {
    console.error("Error generating Google Maps embed URL:", error);
    return NextResponse.json(
      { error: "Failed to generate map embed URL" },
      { status: 500 },
    );
  }
}
