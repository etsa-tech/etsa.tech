"use client";

import Link from "next/link";

export default function GlobalErrorPage({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  console.error("Global error:", error);

  // Global error pages automatically return 500 status in Next.js App Router
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-etsa-dark">
          <div className="max-w-md w-full text-center px-4">
            <div className="mb-8">
              <h1 className="text-9xl font-bold text-etsa-primary dark:text-etsa-primary mb-4">
                500
              </h1>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Something went wrong
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                An unexpected error occurred. Please try again.
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-etsa-primary hover:bg-etsa-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-etsa-primary transition-colors"
              >
                Try Again
              </button>

              <div className="text-sm text-gray-500 dark:text-gray-400">
                <Link
                  href="/"
                  className="text-etsa-primary hover:text-etsa-primary-dark underline"
                >
                  Go Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
