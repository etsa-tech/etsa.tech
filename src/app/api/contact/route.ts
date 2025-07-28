import { NextRequest, NextResponse } from "next/server";
import { validateContactForm } from "@/lib/validation";
import { verifyHCaptcha } from "@/lib/email-config";
import { sendContactEmail } from "@/lib/server-only-email";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const requestData = await request.json();
    console.log("Contact form data received:", {
      ...requestData,
      "h-captcha-response": requestData["h-captcha-response"]
        ? "[PRESENT]"
        : "[MISSING]",
    });

    // Validate form data (includes captcha validation)
    const validation = validateContactForm(requestData);
    if (!validation.success) {
      console.error("Contact form validation failed:", validation.errors);
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors,
        },
        { status: 400 },
      );
    }

    const validatedData = validation.data;

    // Verify hCaptcha separately for better error handling
    const captchaResult = await verifyHCaptcha(
      validatedData["h-captcha-response"],
    );
    if (!captchaResult.success) {
      console.error("hCaptcha verification failed:", captchaResult.error);
      return NextResponse.json(
        { error: captchaResult.error || "Captcha verification failed" },
        { status: 400 },
      );
    }

    // Send contact email to SMTP_TO only
    const emailResult = await sendContactEmail({
      name: validatedData.name,
      email: validatedData.email,
      subject: validatedData.subject,
      message: validatedData.message,
    });

    if (!emailResult.success) {
      console.error("Failed to send contact email:", emailResult.error);
      return NextResponse.json(
        { error: "Failed to send message. Please try again later." },
        { status: 500 },
      );
    }

    console.log("Contact email sent successfully");

    // Success response
    return NextResponse.json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("Contact API error:", error);

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
