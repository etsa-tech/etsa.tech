import ContactForm from "@/components/ContactForm";

export const metadata = {
  title: "Contact ETSA - Get in Touch",
  description:
    "Contact ETSA for speaking opportunities, partnership inquiries, or general questions about our community.",
};

export default function ContactPage() {
  return (
    <div className="container py-12">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Contact Us
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Have questions about ETSA? Interested in speaking at one of our
          meetups? Want to partner with us? We&apos;d love to hear from you!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
        {/* Contact Information */}
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Get in Touch
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
              Whether you&apos;re interested in joining our community, speaking
              at an event, or exploring partnership opportunities, we&apos;re
              here to help. Use the form to send us a message directly.
            </p>
          </div>

          {/* Contact Methods */}
          <div className="space-y-6">
            <div className="card">
              <div className="card-content">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-etsa-primary/10 dark:bg-etsa-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-etsa-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Send us a Message
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-2">
                      Use the contact form to reach out for general inquiries,
                      speaking proposals, or partnership opportunities.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-content">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-etsa-primary/10 dark:bg-etsa-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-etsa-primary"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M6.98 8.125c0 .995-.681 1.801-1.52 1.801s-1.52-.806-1.52-1.801.681-1.801 1.52-1.801 1.52.806 1.52 1.801zm12.24 0c0 .995-.681 1.801-1.52 1.801s-1.52-.806-1.52-1.801.681-1.801 1.52-1.801 1.52.806 1.52 1.801zm2.78 0c0 .995-.681 1.801-1.52 1.801s-1.52-.806-1.52-1.801.681-1.801 1.52-1.801 1.52.806 1.52 1.801zM12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Join Our Meetup
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-2">
                      Connect with us on Meetup for event updates and community
                      discussions.
                    </p>
                    <a
                      href={process.env.NEXT_PUBLIC_MEETUP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-etsa-primary hover:text-etsa-secondary hover:underline transition-colors"
                    >
                      Join our Meetup group
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-content">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-etsa-primary/10 dark:bg-etsa-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-etsa-primary"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      LinkedIn
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-2">
                      Follow us on LinkedIn for professional updates and
                      networking opportunities.
                    </p>
                    <a
                      href={process.env.NEXT_PUBLIC_LINKEDIN_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-etsa-primary hover:text-etsa-secondary hover:underline transition-colors"
                    >
                      Follow us on LinkedIn
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-content">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-etsa-primary/10 dark:bg-etsa-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-etsa-primary"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      GitHub
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-2">
                      Check out our code examples and presentation materials on
                      GitHub.
                    </p>
                    <a
                      href={process.env.NEXT_PUBLIC_GITHUB_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-etsa-primary hover:text-etsa-secondary hover:underline transition-colors"
                    >
                      View our GitHub
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="space-y-8">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Send us a Message</h2>
            </div>
            <div className="card-content">
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
