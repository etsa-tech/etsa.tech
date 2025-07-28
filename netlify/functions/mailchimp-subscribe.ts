import { Handler } from "@netlify/functions";

interface MailchimpResponse {
  success: boolean;
  error?: string;
  member?: any;
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

export const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Request body is required" }),
      };
    }

    const { email, name } = JSON.parse(event.body);

    // Basic validation
    if (!email || !name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Email and name are required" }),
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid email format" }),
      };
    }

    // Subscribe to Mailchimp
    const result = await subscribeToMailchimp({ email, name });

    if (!result.success) {
      console.error("Failed to subscribe to Mailchimp:", result.error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Failed to subscribe to mailing list. Please try again later.",
        }),
      };
    }

    // Success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "Successfully subscribed to mailing list",
        member: result.member,
      }),
    };
  } catch (error) {
    console.error("Mailchimp subscription function error:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error. Please try again later.",
      }),
    };
  }
};
