import { NextRequest, NextResponse } from "next/server";

interface MailchimpMember {
  id: string;
  email_address: string;
  status: string;
  merge_fields: Record<string, string>;
  [key: string]: unknown;
}

interface MailchimpResponse {
  success: boolean;
  error?: string;
  member?: MailchimpMember;
}

// Function to subscribe user to Mailchimp list
async function subscribeToMailchimp(data: {
  email: string;
  name: string;
}): Promise<MailchimpResponse> {
  try {
    const { email, name } = data;

    // Mailchimp configuration
    const apiKey = process.env.MAILCHIMP_API_KEY;
    const listId = process.env.MAILCHIMP_LIST_ID; // Your audience ID
    const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX; // e.g., "us1", "us2"

    if (!apiKey || !serverPrefix) {
      throw new Error("Mailchimp configuration missing");
    }

    // Split name into first and last name (basic approach)
    const nameParts = name.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Mailchimp API endpoint
    const url = `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${listId}/members`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString(
          "base64",
        )}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: email,
        status: "subscribed",
        merge_fields: {
          FNAME: firstName,
          LNAME: lastName,
        },
        tags: ["ETSA Website", "RSVP Signup"],
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      // Handle specific Mailchimp errors
      if (result.title === "Member Exists") {
        // User is already subscribed - this is not really an error
        return {
          success: true,
          member: result,
        };
      }

      throw new Error(
        result.detail || `Mailchimp API error: ${response.status}`,
      );
    }

    return {
      success: true,
      member: result,
    };
  } catch (error) {
    console.error("Mailchimp subscription error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const { email, name } = await request.json();

    console.log("Mailchimp subscription request:", { email, name });

    // Basic validation
    if (!email || !name) {
      return NextResponse.json(
        { error: "Email and name are required" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    // Subscribe to Mailchimp
    const result = await subscribeToMailchimp({ email, name });

    if (!result.success) {
      console.error("Failed to subscribe to Mailchimp:", result.error);
      return NextResponse.json(
        {
          error: "Failed to subscribe to mailing list. Please try again later.",
        },
        { status: 500 },
      );
    }

    console.log("Mailchimp subscription successful");

    // Success response
    return NextResponse.json({
      success: true,
      message: "Successfully subscribed to mailing list",
      member: result.member,
    });
  } catch (error) {
    console.error("Mailchimp subscription API error:", error);

    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
