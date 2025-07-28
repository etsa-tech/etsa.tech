import { Handler } from "@netlify/functions";
import { validateRSVPForm } from "../../src/lib/validation";
import { verifyHCaptcha } from "../../src/lib/email-config";

interface GoogleSheetsResponse {
  success: boolean;
  error?: string;
}

// Function to submit data to Google Sheets
async function submitToGoogleSheets(data: {
  firstName: string;
  lastName: string;
  email: string;
  canAttend: string;
  howDidYouHear: string;
  comments: string;
  subscribeToNewsletter: boolean;
  timestamp: string;
}): Promise<GoogleSheetsResponse> {
  try {
    const {
      firstName,
      lastName,
      email,
      canAttend,
      howDidYouHear,
      comments,
      subscribeToNewsletter,
      timestamp,
    } = data;

    // Google Apps Script webhook approach
    // You'll need to create a Google Apps Script that writes to your sheet
    const googleScriptUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

    if (!googleScriptUrl) {
      throw new Error("Google Sheets webhook URL not configured");
    }

    const response = await fetch(googleScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timestamp,
        email,
        canAttend,
        firstName,
        howDidYouHear,
        comments,
        subscribeToNewsletter,
        lastName,
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.status}`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    return { success: true };
  } catch (error) {
    console.error("Google Sheets submission error:", error);
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

    const requestData = JSON.parse(event.body);
    const { captchaToken, ...formData } = requestData;

    // Verify hCaptcha
    if (!captchaToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Captcha token is required" }),
      };
    }

    const captchaResult = await verifyHCaptcha(captchaToken);
    if (!captchaResult.success) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: captchaResult.error || "Captcha verification failed",
        }),
      };
    }

    // Validate form data
    const validation = validateRSVPForm(formData);
    if (!validation.success) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Validation failed",
          details: validation.errors,
        }),
      };
    }

    const validatedData = validation.data;

    // Submit to Google Sheets
    const sheetsResult = await submitToGoogleSheets({
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      email: validatedData.email,
      canAttend: validatedData.canAttend,
      howDidYouHear: validatedData.howDidYouHear,
      comments: validatedData.comments || "",
      subscribeToNewsletter: validatedData.subscribeToNewsletter,
      timestamp: new Date().toISOString(),
    });

    if (!sheetsResult.success) {
      console.error("Failed to submit to Google Sheets:", sheetsResult.error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Failed to save RSVP. Please try again later.",
        }),
      };
    }

    // Success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "RSVP submitted successfully",
      }),
    };
  } catch (error) {
    console.error("RSVP function error:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error. Please try again later.",
      }),
    };
  }
};
