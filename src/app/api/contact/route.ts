import { NextRequest } from "next/server";
import { validateContactForm } from "@/lib/validation";
import { sendContactEmail } from "@/lib/server-only-email";
import {
  createApiHandler,
  parseRequestBody,
  validateCaptcha,
  createErrorResponse,
  createSuccessResponse,
  logRequestData,
} from "@/lib/api-utils";

// Force dynamic rendering - this is a serverless function
export const dynamic = "force-dynamic";

async function handleContactSubmission(
  request: NextRequest,
  origin: string | null,
) {
  // Parse and log request
  const requestData = await parseRequestBody(request);
  logRequestData(requestData, "Contact form");

  // Validate form data
  const validation = validateContactForm(requestData);
  if (!validation.success) {
    console.error("Contact form validation failed:", validation.errors);
    return createErrorResponse("Validation failed", 400, origin);
  }

  const validatedData = validation.data;

  // Verify hCaptcha
  await validateCaptcha(validatedData["h-captcha-response"]);

  // Extract hostname from request
  const hostname = request.headers.get("host") || "Unknown";

  // Send contact email
  const emailResult = await sendContactEmail({
    name: validatedData.name,
    email: validatedData.email,
    subject: validatedData.subject,
    message: validatedData.message,
    hostname: hostname,
  });

  if (!emailResult.success) {
    console.error("Failed to send contact email:", emailResult.error);
    throw new Error("Failed to send message. Please try again later.");
  }

  console.log("Contact email sent successfully");
  return createSuccessResponse(
    {
      success: true,
      message: "Message sent successfully",
    },
    origin,
  );
}

export const POST = createApiHandler(handleContactSubmission);

// Export OPTIONS handler with request parameter for CORS validation
export async function OPTIONS(request: NextRequest) {
  const { handleOptions } = await import("@/lib/api-utils");
  return handleOptions(request);
}
