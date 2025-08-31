import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-etsa-dark">
      <div className="max-w-md w-full text-center px-4">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-etsa-primary dark:text-etsa-primary mb-4">
            404
          </h1>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Page Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-etsa-primary hover:bg-etsa-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-etsa-primary transition-colors"
          >
            Go Home
          </Link>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            <Link
              href="/presentations"
              className="text-etsa-primary hover:text-etsa-primary-dark underline"
            >
              Browse Presentations
            </Link>
            {" · "}
            <Link
              href="/blog"
              className="text-etsa-primary hover:text-etsa-primary-dark underline"
            >
              Read Blog
            </Link>
            {" · "}
            <Link
              href="/contact"
              className="text-etsa-primary hover:text-etsa-primary-dark underline"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
