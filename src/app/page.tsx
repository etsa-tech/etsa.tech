export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-etsa-primary dark:bg-etsa-secondary text-white py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">
            {process.env.NEXT_PUBLIC_ORG_NAME}
          </h1>
          <p className="text-xl mb-8">
            Professional meetup organization in{" "}
            {process.env.NEXT_PUBLIC_ORG_LOCATION}
          </p>
          <div className="space-x-4">
            <a
              href={process.env.NEXT_PUBLIC_MEETUP_URL}
              className="bg-white text-etsa-primary hover:bg-gray-50 hover:text-etsa-secondary px-6 py-3 rounded font-medium inline-block transition-colors"
            >
              Join Meetup
            </a>
            <a
              href="/about"
              className="border border-white text-white px-6 py-3 rounded font-medium inline-block"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">
            About Our Community
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-etsa-primary/10 dark:bg-etsa-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-etsa-primary dark:text-etsa-light"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Learn
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Stay current with the latest technologies and best practices.
              </p>
            </div>
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-etsa-primary/10 dark:bg-etsa-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-etsa-primary dark:text-etsa-light"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Network
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Connect with like-minded professionals in East Tennessee and
                virtually!
              </p>
            </div>
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-etsa-primary/10 dark:bg-etsa-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-etsa-primary dark:text-etsa-light"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Grow
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Advance your career through knowledge sharing and mentorship.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50 dark:bg-etsa-secondary">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">
            Our Impact
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-4xl font-bold text-etsa-primary mb-2">
                {Math.ceil(
                  (new Date().getFullYear() -
                    parseInt(
                      process.env.NEXT_PUBLIC_ORG_FOUNDED_YEAR || "2012",
                    )) *
                    11.6,
                )}
                +
              </div>
              <div className="text-gray-600 dark:text-gray-300">
                Presentations
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-etsa-primary mb-2">
                {process.env.NEXT_PUBLIC_MEMBER_COUNT}+
              </div>
              <div className="text-gray-600 dark:text-gray-300">Members</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-etsa-primary mb-2">
                {new Date().getFullYear() -
                  parseInt(process.env.NEXT_PUBLIC_ORG_FOUNDED_YEAR || "2012")}
                +
              </div>
              <div className="text-gray-600 dark:text-gray-300">
                Years Active
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
