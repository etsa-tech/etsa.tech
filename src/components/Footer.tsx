import Link from "next/link";
import Image from "next/image";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-etsa-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <Image
                src="/static/logo.jpg"
                alt={`${process.env.NEXT_PUBLIC_ORG_NAME} Logo`}
                width={40}
                height={40}
                className="h-10 w-10 rounded-lg object-cover"
              />
              <div className="flex flex-col">
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {process.env.NEXT_PUBLIC_ORG_NAME}
                </span>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 max-w-md">
              A professional meetup organization based in{" "}
              {process.env.NEXT_PUBLIC_ORG_LOCATION}, bringing together systems
              administrators, DevOps engineers, and technology professionals to
              share knowledge and build community.
            </p>
            <div className="flex items-center space-x-4 mt-6">
              <a
                href={process.env.NEXT_PUBLIC_GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:text-etsa-primary dark:hover:text-etsa-light transition-colors"
                aria-label="GitHub"
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <a
                href={process.env.NEXT_PUBLIC_LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-light-muted dark:text-dark-muted hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                aria-label="LinkedIn"
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href={process.env.NEXT_PUBLIC_MEETUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-light-muted dark:text-dark-muted hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                aria-label="Meetup"
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6.98 8.125c0 .995-.681 1.801-1.52 1.801s-1.52-.806-1.52-1.801.681-1.801 1.52-1.801 1.52.806 1.52 1.801zm12.24 0c0 .995-.681 1.801-1.52 1.801s-1.52-.806-1.52-1.801.681-1.801 1.52-1.801 1.52.806 1.52 1.801zm2.78 0c0 .995-.681 1.801-1.52 1.801s-1.52-.806-1.52-1.801.681-1.801 1.52-1.801 1.52.806 1.52 1.801zM12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
                </svg>
              </a>
              <a
                href="/rss.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:text-etsa-primary dark:hover:text-etsa-light transition-colors"
                aria-label="RSS Feed"
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6.503 20.752c0 1.794-1.456 3.248-3.251 3.248S0 22.546 0 20.752s1.456-3.248 3.252-3.248 3.251 1.454 3.251 3.248zM1.677 6.155v4.301c5.493 0 9.967 4.474 9.967 9.967h4.301c0-7.869-6.399-14.268-14.268-14.268zM1.677 0v4.301c9.737 0 17.624 7.887 17.624 17.624H24C24 9.804 14.196 0 1.677 0z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Sponsors Section */}
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-3">
              Our Sponsors/Ways to Give
            </h3>
            <div className="space-y-3">
              {/* Eldie Design */}
              <div className="group">
                <a
                  href="https://eldiedesign.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 group-hover:scale-105 border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-white">
                      <Image
                        src="/sponsors/eldiedesigns.png"
                        alt="Eldie Designs"
                        width={32}
                        height={32}
                        className="w-full h-full rounded-lg object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                        Eldie Design
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Creative Solutions
                      </div>
                    </div>
                  </div>
                </a>
              </div>

              {/* Givebutter */}
              <div className="group">
                <a
                  href="https://givebutter.com/etsa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 group-hover:scale-105 border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-white">
                      <Image
                        src="/sponsors/givebutter.jpeg"
                        alt="Donate via GiveButter"
                        width={32}
                        height={32}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                        Givebutter
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Fundraising Platform
                      </div>
                    </div>
                  </div>
                </a>
              </div>

              {/* TEKsystems */}
              <div className="group">
                <a
                  href="https://www.teksystems.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 group-hover:scale-105 border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-white">
                      <Image
                        src="/sponsors/teksystems.jpeg"
                        alt="TekSystems"
                        width={32}
                        height={32}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                        TEKsystems
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        IT Staffing & Services
                      </div>
                    </div>
                  </div>
                </a>
              </div>
            </div>

            <div className="mt-4 text-center">
              <a
                href="/contact"
                className="text-xs text-etsa-primary hover:text-etsa-secondary transition-colors"
              >
                Become a Sponsor
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-3">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-gray-600 dark:text-gray-400 hover:text-etsa-primary dark:hover:text-etsa-light transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/speakers"
                  className="text-gray-600 dark:text-gray-400 hover:text-etsa-primary dark:hover:text-etsa-light transition-colors"
                >
                  Past Speakers
                </Link>
              </li>
              <li>
                <Link
                  href="/meeting-info"
                  className="text-gray-600 dark:text-gray-400 hover:text-etsa-primary dark:hover:text-etsa-light transition-colors"
                >
                  Meeting Info
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-gray-600 dark:text-gray-400 hover:text-etsa-primary dark:hover:text-etsa-light transition-colors"
                >
                  About ETSA
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-600 dark:text-gray-400 hover:text-etsa-primary dark:hover:text-etsa-light transition-colors"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-3">
              Community
            </h3>
            <ul className="space-y-2">
              <li>
                <a
                  href={process.env.NEXT_PUBLIC_MEETUP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 dark:text-gray-400 hover:text-etsa-primary dark:hover:text-etsa-light transition-colors"
                >
                  Join Meetup
                </a>
              </li>
              <li>
                <a
                  href={process.env.NEXT_PUBLIC_GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 dark:text-gray-400 hover:text-etsa-primary dark:hover:text-etsa-light transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href={process.env.NEXT_PUBLIC_LINKEDIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 dark:text-gray-400 hover:text-etsa-primary dark:hover:text-etsa-light transition-colors"
                >
                  LinkedIn
                </a>
              </li>
              <li>
                <Link
                  href="/speakers"
                  className="text-gray-600 dark:text-gray-400 hover:text-etsa-primary dark:hover:text-etsa-light transition-colors"
                >
                  Become a Speaker
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              © {currentYear} {process.env.NEXT_PUBLIC_ORG_NAME}. All rights
              reserved.
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-4 md:mt-0">
              Built with ❤️ in {process.env.NEXT_PUBLIC_ORG_LOCATION}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
