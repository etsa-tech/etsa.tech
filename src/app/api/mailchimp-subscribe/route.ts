import { NextRequest } from "next/server";
import {
  createApiHandler,
  parseRequestBody,
  createErrorResponse,
  createSuccessResponse,
  logRequestData,
} from "@/lib/api-utils";

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

// Email validation regex
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

async function handleMailchimpSubscription(request: NextRequest) {
  // Parse and log request
  const requestData = await parseRequestBody(request);
  const { email, name } = requestData;
  logRequestData({ email, name }, "Mailchimp subscription");

  // Basic validation
  if (!email || !name) {
    return createErrorResponse("Email and name are required");
  }

  // Validate email format
  if (!EMAIL_REGEX.test(email)) {
    return createErrorResponse("Invalid email format");
  }

  // Subscribe to Mailchimp
  const result = await subscribeToMailchimp({ email, name });

  if (!result.success) {
    console.error("Failed to subscribe to Mailchimp:", result.error);
    throw new Error(
      "Failed to subscribe to mailing list. Please try again later.",
    );
  }

  console.log("Mailchimp subscription successful");
  return createSuccessResponse({
    success: true,
    message: "Successfully subscribed to mailing list",
    member: result.member,
  });
}

export const POST = createApiHandler(handleMailchimpSubscription);
export { handleOptions as OPTIONS } from "@/lib/api-utils";
