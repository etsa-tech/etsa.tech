import { NextRequest, NextResponse } from "next/server";
import { verifyHCaptcha } from "@/lib/email-config";

// Common CORS headers
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Cache control headers for sensitive endpoints (F-2025-22309)
export const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// Combined headers for API responses with no-cache
export const API_HEADERS_NO_CACHE = {
  ...CORS_HEADERS,
  ...NO_CACHE_HEADERS,
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
  // Sanitize error message in production to prevent information disclosure
  const sanitizedMessage =
    process.env.NODE_ENV === "production"
      ? sanitizeErrorMessage(message, status)
      : message;

  return NextResponse.json(
    { error: sanitizedMessage },
    { status, headers: CORS_HEADERS },
  );
}

/**
 * Sanitize error messages to prevent information disclosure
 * In production, return generic messages instead of detailed errors
 */
function sanitizeErrorMessage(_message: string, status: number): string {
  // Map status codes to generic messages
  const genericMessages: Record<number, string> = {
    400: "Bad request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not found",
    405: "Method not allowed",
    429: "Too many requests",
    500: "Internal server error",
    502: "Bad gateway",
    503: "Service unavailable",
  };

  // Return generic message for the status code
  return genericMessages[status] || "An error occurred";
}

// Create success response with CORS headers
export function createSuccessResponse(data: Record<string, unknown>) {
  return NextResponse.json(data, { headers: CORS_HEADERS });
}

// Create success response with no-cache headers (for sensitive data)
export function createSuccessResponseNoCache(data: Record<string, unknown>) {
  return NextResponse.json(data, { headers: API_HEADERS_NO_CACHE });
}

// Create error response with no-cache headers (for sensitive endpoints)
export function createErrorResponseNoCache(
  message: string,
  status: number = 400,
) {
  const sanitizedMessage =
    process.env.NODE_ENV === "production"
      ? sanitizeErrorMessage(message, status)
      : message;

  return NextResponse.json(
    { error: sanitizedMessage },
    { status, headers: API_HEADERS_NO_CACHE },
  );
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
      // Log detailed error server-side for debugging
      console.error("API handler error:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      // Return sanitized error to client
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

/**
 * Safely log errors without exposing sensitive information
 * Logs detailed information server-side, but never to client
 */
export function logError(
  error: unknown,
  context: string,
  additionalInfo?: Record<string, unknown>,
) {
  const errorDetails = {
    context,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    ...additionalInfo,
  };

  // Only log detailed errors server-side
  console.error(`[Error] ${context}:`, errorDetails);
}

/**
 * Create a safe error response for API routes
 * Returns generic message in production, detailed in development
 */
export function createSafeErrorResponse(
  error: unknown,
  context: string,
  status: number = 500,
): NextResponse {
  // Log the error server-side
  logError(error, context);

  // Return generic error message
  let message = "An error occurred";
  if (process.env.NODE_ENV !== "production") {
    message = error instanceof Error ? error.message : "Unknown error";
  }

  return createErrorResponse(message, status);
}
