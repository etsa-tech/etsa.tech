import { NextRequest, NextResponse } from "next/server";
import { verifyHCaptcha } from "@/lib/email-config";

/**
 * Allowed origins for CORS (F-2025-22310)
 * Only these origins can make cross-origin requests to the API
 */
const ALLOWED_ORIGINS = new Set([
  "https://etsa.tech",
  "https://www.etsa.tech",
  "http://localhost:3000", // Development
  "http://localhost:8888", // Netlify dev
]);

// Regex patterns for dynamic origins
const NETLIFY_DEPLOY_PREVIEW_PATTERN =
  /^https:\/\/deploy-preview-\d+-etsa-tech\.netlify\.app$/;
const NETLIFY_BRANCH_DEPLOY_PATTERN =
  /^https:\/\/[a-z0-9-]+--etsa-tech\.netlify\.app$/;

/**
 * Validate if an origin is allowed
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  // Check exact match
  if (ALLOWED_ORIGINS.has(origin)) {
    return true;
  }

  // Allow Netlify deploy previews (deploy-preview-*.netlify.app)
  if (NETLIFY_DEPLOY_PREVIEW_PATTERN.exec(origin)) {
    return true;
  }

  // Allow Netlify branch deploys (branch-name--etsa-tech.netlify.app)
  if (NETLIFY_BRANCH_DEPLOY_PATTERN.exec(origin)) {
    return true;
  }

  return false;
}

/**
 * Get CORS headers for a specific origin
 * Returns appropriate headers based on origin validation
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = isOriginAllowed(origin) ? origin : "null";

  return {
    "Access-Control-Allow-Origin": allowedOrigin || "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin", // Important: tells caches that response varies by Origin
  };
}

// Legacy CORS headers (deprecated - use getCorsHeaders instead)
// Kept for backward compatibility but should not be used for new code
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

/**
 * Handle OPTIONS requests (CORS preflight)
 * Now validates origin against whitelist (F-2025-22310)
 */
export function handleOptions(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

/**
 * Create error response with CORS headers
 * Now validates origin against whitelist (F-2025-22310)
 */
export function createErrorResponse(
  message: string,
  status: number = 400,
  origin: string | null = null,
) {
  // Sanitize error message in production to prevent information disclosure
  const sanitizedMessage =
    process.env.NODE_ENV === "production"
      ? sanitizeErrorMessage(message, status)
      : message;

  const corsHeaders = origin ? getCorsHeaders(origin) : CORS_HEADERS;

  return NextResponse.json(
    { error: sanitizedMessage },
    { status, headers: corsHeaders },
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

/**
 * Create success response with CORS headers
 * Now validates origin against whitelist (F-2025-22310)
 */
export function createSuccessResponse(
  data: Record<string, unknown>,
  origin: string | null = null,
) {
  const corsHeaders = origin ? getCorsHeaders(origin) : CORS_HEADERS;
  return NextResponse.json(data, { headers: corsHeaders });
}

/**
 * Create success response with no-cache headers (for sensitive data)
 * Now validates origin against whitelist (F-2025-22310)
 */
export function createSuccessResponseNoCache(
  data: Record<string, unknown>,
  origin: string | null = null,
) {
  const corsHeaders = origin ? getCorsHeaders(origin) : CORS_HEADERS;
  const headers = { ...corsHeaders, ...NO_CACHE_HEADERS };
  return NextResponse.json(data, { headers });
}

/**
 * Create error response with no-cache headers (for sensitive endpoints)
 * Now validates origin against whitelist (F-2025-22310)
 */
export function createErrorResponseNoCache(
  message: string,
  status: number = 400,
  origin: string | null = null,
) {
  const sanitizedMessage =
    process.env.NODE_ENV === "production"
      ? sanitizeErrorMessage(message, status)
      : message;

  const corsHeaders = origin ? getCorsHeaders(origin) : CORS_HEADERS;
  const headers = { ...corsHeaders, ...NO_CACHE_HEADERS };

  return NextResponse.json({ error: sanitizedMessage }, { status, headers });
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

/**
 * Generic API handler wrapper
 * Now validates origin against whitelist (F-2025-22310)
 */
export function createApiHandler(
  handler: (
    request: NextRequest,
    origin: string | null,
  ) => Promise<NextResponse>,
) {
  return async (request: NextRequest) => {
    const origin = request.headers.get("origin");

    // Handle OPTIONS requests
    if (request.method === "OPTIONS") {
      return handleOptions(request);
    }

    // Only allow POST requests
    if (request.method !== "POST") {
      return createErrorResponse("Method not allowed", 405, origin);
    }

    try {
      return await handler(request, origin);
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
      return createErrorResponse(message, 500, origin);
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
