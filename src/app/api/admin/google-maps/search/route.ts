import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!isAuthorizedUser(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 },
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY_GEOCODING;
    if (!apiKey) {
      console.error("Google Maps API key not configured");
      return NextResponse.json(
        { error: "Google Maps API key not configured" },
        { status: 500 },
      );
    }

    console.log(`Searching Google Maps for: ${query}`);

    // Does not support website restrictions https://developers.google.com/maps/faq#restriction "It used to be possible to get this error if you used any of the web service APIs"
    const googleMapsUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      query,
    )}&key=${apiKey}`;
    console.log(
      `Making request to: ${googleMapsUrl.replace(apiKey, "HIDDEN_API_KEY")}`,
    );

    const response = await fetch(googleMapsUrl);

    console.log(`Google Maps API HTTP status: ${response.status}`);

    if (!response.ok) {
      console.error(
        `Google Maps API HTTP error: ${response.status} ${response.statusText}`,
      );
      throw new Error(`Google Maps API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Google Maps API response status: ${data.status}`);
    console.log(
      `Google Maps API full response:`,
      JSON.stringify(data, null, 2),
    );

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      console.log("No results found for query:", query);
      return NextResponse.json({ error: "No results found" }, { status: 404 });
    }

    const result = data.results[0];
    const location = result.geometry.location;

    // Extract venue name from the response
    let venueName = query; // fallback to original query

    // Try to get the business name from various sources
    if (result.name) {
      venueName = result.name;
    } else {
      // Look for establishment or point_of_interest in address_components
      const addressComponents = result.address_components || [];
      interface AddressComponent {
        long_name: string;
        short_name: string;
        types: string[];
      }

      const establishment = addressComponents.find(
        (component: AddressComponent) =>
          component.types.includes("establishment") ||
          component.types.includes("point_of_interest"),
      );

      if (establishment) {
        venueName = establishment.long_name;
      } else {
        // If no establishment found, try to extract from formatted_address
        // For businesses, the name is often the first part before the comma
        const addressParts = result.formatted_address.split(",");
        if (addressParts.length > 1) {
          const firstPart = addressParts[0].trim();
          // Check if first part looks like a business name (not just a street number)
          if (!/^\d+/.test(firstPart)) {
            venueName = firstPart;
          }
        }
      }
    }

    const searchResult = {
      name: venueName,
      address: result.formatted_address,
      lat: location.lat.toString(),
      lng: location.lng.toString(),
    };

    console.log("Returning search result:", searchResult);

    return NextResponse.json(searchResult);
  } catch (error) {
    console.error("Error in Google Maps search:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
