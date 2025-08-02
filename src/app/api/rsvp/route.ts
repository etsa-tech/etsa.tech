import { NextRequest } from "next/server";
import { validateRSVPForm } from "@/lib/validation";
import {
  createApiHandler,
  parseRequestBody,
  validateCaptcha,
  createErrorResponse,
  createSuccessResponse,
  logRequestData,
} from "@/lib/api-utils";

interface GoogleSheetsResponse {
  success: boolean;
  error?: string;
}

interface RSVPData {
  firstName: string;
  lastName: string;
  email: string;
  canAttend: string;
  howDidYouHear: string;
  comments: string;
  subscribeToNewsletter: boolean;
  event: string;
  timestamp: string;
}

// Function to submit data to Google Sheets
async function submitToGoogleSheets(
  data: RSVPData,
): Promise<GoogleSheetsResponse> {
  try {
    const {
      firstName,
      lastName,
      email,
      canAttend,
      howDidYouHear,
      comments,
      subscribeToNewsletter,
      event,
      timestamp,
    } = data;

    // Google Apps Script webhook approach
    const googleScriptUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

    console.log("Google Sheets URL:", googleScriptUrl);

    if (!googleScriptUrl) {
      throw new Error("Google Sheets webhook URL not configured");
    }

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for Google Sheets

    try {
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
          event,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Google Sheets API error: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      return { success: true };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Google Sheets API request timed out");
      }
      throw error;
    }
  } catch (error) {
    console.error("Google Sheets submission error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

async function handleRSVPSubmission(request: NextRequest) {
  // Parse and log request
  const requestData = await parseRequestBody(request);
  const { captchaToken, ...formData } = requestData;
  logRequestData(requestData, "RSVP form");

  // Verify hCaptcha
  await validateCaptcha(captchaToken);

  // Validate form data
  const validation = validateRSVPForm(formData);
  if (!validation.success) {
    console.error("RSVP form validation failed:", validation.errors);
    return createErrorResponse("Validation failed");
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
    event: formData.meetingTitle || "ETSA Meetup",
    timestamp: new Date().toISOString(),
  });

  if (!sheetsResult.success) {
    console.error("Failed to submit to Google Sheets:", sheetsResult.error);
    throw new Error("Failed to save RSVP. Please try again later.");
  }

  console.log("RSVP submitted successfully");
  return createSuccessResponse({
    success: true,
    message: "RSVP submitted successfully",
  });
}

export const POST = createApiHandler(handleRSVPSubmission);
export { handleOptions as OPTIONS } from "@/lib/api-utils";
