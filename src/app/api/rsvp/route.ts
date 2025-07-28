import { NextRequest, NextResponse } from "next/server";
import { validateRSVPForm } from "@/lib/validation";
import { verifyHCaptcha } from "@/lib/email-config";

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
    const googleScriptUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

    console.log("Google Sheets URL:", googleScriptUrl);

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

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const requestData = await request.json();
    const { captchaToken, ...formData } = requestData;

    console.log("RSVP form data received:", {
      ...formData,
      captchaToken: captchaToken ? "[PRESENT]" : "[MISSING]",
    });

    // Verify hCaptcha
    if (!captchaToken) {
      return NextResponse.json(
        { error: "Captcha token is required" },
        { status: 400 },
      );
    }

    const captchaResult = await verifyHCaptcha(captchaToken);
    if (!captchaResult.success) {
      console.error("hCaptcha verification failed:", captchaResult.error);
      return NextResponse.json(
        { error: captchaResult.error || "Captcha verification failed" },
        { status: 400 },
      );
    }

    // Validate form data
    const validation = validateRSVPForm(formData);
    if (!validation.success) {
      console.error("RSVP form validation failed:", validation.errors);
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors,
        },
        { status: 400 },
      );
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
      return NextResponse.json(
        { error: "Failed to save RSVP. Please try again later." },
        { status: 500 },
      );
    }

    console.log("RSVP submitted successfully");

    // Success response
    return NextResponse.json({
      success: true,
      message: "RSVP submitted successfully",
    });
  } catch (error) {
    console.error("RSVP API error:", error);

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
