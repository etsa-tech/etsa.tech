import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withAuth } from "next-auth/middleware";

/**
 * Security Middleware
 *
 * This middleware provides multiple security protections:
 * 1. Path traversal attack detection and blocking
 * 2. Malicious pattern detection
 * 3. Request sanitization
 */

// Path traversal patterns to detect and block
const MALICIOUS_PATTERNS = [
  /\.\./g, // Parent directory traversal
  /\/etc\//i, // Unix system files
  /\/proc\//i, // Unix process files
  /\/sys\//i, // Unix system files
  /\/var\//i, // Unix variable files
  /\/usr\//i, // Unix user files
  /\/home\//i, // Unix home directories
  /\/root\//i, // Unix root directory
  /\\windows\\/i, // Windows system directory
  /\\system32\\/i, // Windows system directory
  /\.\.\\/, // Windows path traversal
  /%2e%2e/i, // URL encoded ..
  /%252e/i, // Double URL encoded .
  /\.\.\//g, // Unix path traversal
  /\.\.\\/g, // Windows path traversal
];

/**
 * Check if a URL contains malicious patterns
 */
function containsMaliciousPattern(url: string): boolean {
  const decodedUrl = decodeURIComponent(url);
  return MALICIOUS_PATTERNS.some((pattern) => pattern.test(decodedUrl));
}

/**
 * Main middleware function
 */
export default withAuth(
  function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Get client IP from headers (Netlify provides this)
    const clientIp =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Check for path traversal attempts
    if (containsMaliciousPattern(pathname)) {
      console.warn(
        `[Security] Blocked path traversal attempt: ${pathname} from ${clientIp}`,
      );

      // Return a generic 404 to avoid information disclosure
      // Don't reveal that we detected an attack
      return new NextResponse(null, {
        status: 404,
        statusText: "Not Found",
      });
    }

    // Check for suspicious query parameters
    const searchParams = request.nextUrl.searchParams;
    for (const [key, value] of searchParams.entries()) {
      if (containsMaliciousPattern(value)) {
        console.warn(
          `[Security] Blocked malicious query parameter: ${key}=${value} from ${clientIp}`,
        );

        return new NextResponse(null, {
          status: 404,
          statusText: "Not Found",
        });
      }
    }

    // Continue with the request
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true, // Let the admin layout handle authentication
    },
  },
);

export const config = {
  // Apply middleware to all routes
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
