export const metadata = {
  title: "Privacy Policy",
  description:
    "How ETSA collects, uses, and protects your information. We never sell or share your data with third parties for marketing purposes.",
};

const EFFECTIVE_DATE = "August 8, 2026";

export default function PrivacyPage() {
  return (
    <div className="container py-12">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Privacy Policy
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          {process.env.NEXT_PUBLIC_ORG_NAME} respects your privacy. We will
          never sell or share your personal information. The information you
          give us is used only to run our events and, if you opt in, to send you
          our newsletter.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
          Effective date: {EFFECTIVE_DATE}
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-12">
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Information We Collect
          </h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            We only collect information you choose to give us:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
            <li>
              <strong>Contact form:</strong> your name, email address, and
              message, so we can respond to you.
            </li>
            <li>
              <strong>Event RSVPs:</strong> your name, email address, attendance
              response, and and additional information you added, so we can
              manage attendance and venue logistics.
            </li>
            <li>
              <strong>Newsletter signup:</strong> your name and email address,
              only if you opt in.
            </li>
            <li>
              <strong>Basic site analytics:</strong> aggregate, anonymized usage
              data (such as pages viewed) collected automatically to help us
              understand how the site is used. We do not use this data to build
              advertising profiles.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            How We Use Your Information
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
            <li>To respond to messages sent through our contact form.</li>
            <li>
              To confirm you for meetups and coordinate with venues and
              speakers.
            </li>
            <li>To send our newsletter and event announcements.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            We Never Sell or Share Your Data
          </h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            {process.env.NEXT_PUBLIC_ORG_NAME} does not sell, rent, or trade
            your personal information to anyone, for any reason. We only pass
            your information to the trusted service providers we use to operate
            the site and events, and only for that purpose:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
            <li>
              A newsletter provider, to deliver the newsletter to subscribers
              who opted in.
            </li>
            <li>
              A spreadsheet/event-management tool, to track RSVPs for a specific
              meetup.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Newsletter &amp; Email Communications
          </h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            We only email you a newsletter if you opted in, either through the
            RSVP form or a direct signup. Every newsletter email includes an
            unsubscribe link, and you can opt out at any time.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Cookies
          </h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            We use a small, non-tracking cookie to remember details you already
            entered in the RSVP form so you don&apos;t have to retype them next
            time. We do not use third-party advertising cookies.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Data Retention
          </h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            We keep RSVP and contact information (Name & Email) as long as ETSA
            is an organization to run our events and respond to inquiries.
            Newsletter subscriber information is kept until you unsubscribe or
            ask us to remove it.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Your Rights &amp; Choices
          </h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            You can ask us to access, correct, or delete your personal
            information, or unsubscribe from the newsletter, at any time by
            reaching out through our{" "}
            <a
              href="/contact"
              className="text-etsa-primary hover:text-etsa-secondary hover:underline"
            >
              contact form
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Third-Party Services
          </h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Our site uses the following third-party services, each governed by
            its own privacy policy:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
            <li>
              <strong>GitHub</strong> (admin sign-in and content hosting) —{" "}
              <a
                href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
                target="_blank"
                rel="noopener noreferrer"
                className="text-etsa-primary hover:text-etsa-secondary hover:underline"
              >
                Privacy Statement
              </a>
            </li>
            <li>
              <strong>Google Maps</strong> (embedded meeting location maps) —{" "}
              <a
                href="https://developers.google.com/maps/terms-20180207"
                target="_blank"
                rel="noopener noreferrer"
                className="text-etsa-primary hover:text-etsa-secondary hover:underline"
              >
                Maps/Google Earth Additional Terms of Service
              </a>
            </li>
            <li>
              <strong>Google Sheets</strong> (RSVP tracking) —{" "}
              <a
                href="https://support.google.com/docs/answer/10381817?hl=en"
                target="_blank"
                rel="noopener noreferrer"
                className="text-etsa-primary hover:text-etsa-secondary hover:underline"
              >
                Data Privacy &amp; Security
              </a>
            </li>
            <li>
              <strong>hCaptcha</strong> (spam protection on our forms) —{" "}
              <a
                href="https://www.hcaptcha.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-etsa-primary hover:text-etsa-secondary hover:underline"
              >
                Privacy Policy
              </a>
            </li>
            <li>
              <strong>Meetup</strong> (event listings and RSVPs) —{" "}
              <a
                href="https://help.meetup.com/hc/en-us/articles/360044422391-Privacy-Policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-etsa-primary hover:text-etsa-secondary hover:underline"
              >
                Privacy Policy
              </a>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Changes to This Policy
          </h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            If we change this policy, we&apos;ll update the effective date above
            and post the revised policy on this page.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Contact Us
          </h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Questions about this policy or your data? Reach out via our{" "}
            <a
              href="/contact"
              className="text-etsa-primary hover:text-etsa-secondary hover:underline"
            >
              contact page
            </a>{" "}
            or email{" "}
            <a
              href="mailto:website@etsa.tech"
              className="text-etsa-primary hover:text-etsa-secondary hover:underline"
            >
              website@etsa.tech
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
