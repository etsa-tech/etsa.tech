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

async function handleContactSubmission(request: NextRequest) {
  // Parse and log request
  const requestData = await parseRequestBody(request);
  logRequestData(requestData, "Contact form");

  // Validate form data
  const validation = validateContactForm(requestData);
  if (!validation.success) {
    console.error("Contact form validation failed:", validation.errors);
    return createErrorResponse("Validation failed");
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
  return createSuccessResponse({
    success: true,
    message: "Message sent successfully",
  });
}

export const POST = createApiHandler(handleContactSubmission);
export { handleOptions as OPTIONS } from "@/lib/api-utils";
