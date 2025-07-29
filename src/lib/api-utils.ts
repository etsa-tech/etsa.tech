import { NextRequest, NextResponse } from "next/server";
import { verifyHCaptcha } from "@/lib/email-config";

// Common CORS headers
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Handle OPTIONS requests (CORS preflight)
export function handleOptions() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

// Create error response with CORS headers
export function createErrorResponse(message: string, status: number = 400) {
  return NextResponse.json(
    { error: message },
    { status, headers: CORS_HEADERS },
  );
}

// Create success response with CORS headers
export function createSuccessResponse(data: Record<string, unknown>) {
  return NextResponse.json(data, { headers: CORS_HEADERS });
}

// Parse and validate request body
export async function parseRequestBody(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body) {
      throw new Error("Request body is required");
    }
    return body;
  } catch {
    throw new Error("Invalid JSON in request body");
  }
}

// Verify hCaptcha token
export async function validateCaptcha(captchaToken: string) {
  if (!captchaToken) {
    throw new Error("Captcha token is required");
  }

  const captchaResult = await verifyHCaptcha(captchaToken);
  if (!captchaResult.success) {
    throw new Error(captchaResult.error || "Captcha verification failed");
  }
}

// Generic API handler wrapper
export function createApiHandler(
  handler: (request: NextRequest) => Promise<NextResponse>,
) {
  return async (request: NextRequest) => {
    // Handle OPTIONS requests
    if (request.method === "OPTIONS") {
      return handleOptions();
    }

    // Only allow POST requests
    if (request.method !== "POST") {
      return createErrorResponse("Method not allowed", 405);
    }

    try {
      return await handler(request);
    } catch (error) {
      console.error("API handler error:", error);
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return createErrorResponse(message, 500);
    }
  };
}

// Log request data (with sensitive data masking)
export function logRequestData(
  data: Record<string, unknown>,
  endpoint: string,
) {
  const sanitizedData = {
    ...data,
    captchaToken: data.captchaToken ? "[PRESENT]" : "[MISSING]",
  };
  console.log(`${endpoint} request received:`, sanitizedData);
}
