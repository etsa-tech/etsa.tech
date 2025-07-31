import { getAllPosts } from "@/lib/blog";
import RSVPForm from "@/components/RSVPForm";

export const metadata = {
  title: "RSVP - ETSA",
  description:
    "RSVP for upcoming ETSA meetups. Let us know you're coming and help us plan accordingly.",
};

export default function RSVPPage() {
  const posts = getAllPosts();
  const latestPost = posts[0];

  // Get meeting information from latest post or use defaults
  const meetingDate =
    latestPost?.frontmatter?.meetingDate ||
    "First Tuesday of each month at 7:00 PM";

  const meetingTitle = latestPost?.frontmatter?.title || "ETSA Meetup";

  return (
    <div className="container py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          RSVP for ETSA Meetup
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          We&apos;re excited to have you join us! Please fill out the form below
          to let us know you&apos;re coming. This helps us plan for food,
          seating, and any special accommodations you might need.
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Meeting Information Card */}
        {latestPost && (
          <div className="card mb-8">
            <div className="card-header">
              <h2 className="card-title">Next Meeting Details</h2>
            </div>
            <div className="card-content">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-etsa-primary mb-2">
                    {meetingTitle}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {meetingDate}
                  </p>
                </div>

                {latestPost.frontmatter.description && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                      About this meeting:
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      {latestPost.frontmatter.description}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    You can also{" "}
                    <a
                      href={process.env.NEXT_PUBLIC_MEETUP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-etsa-primary hover:text-etsa-secondary transition-colors"
                    >
                      RSVP on Meetup
                    </a>{" "}
                    if you prefer.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RSVP Form */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">RSVP Form</h2>
          </div>
          <div className="card-content">
            <RSVPForm meetingDate={meetingDate} meetingTitle={meetingTitle} />
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-8 text-center">
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Need More Information?
            </h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <p>
                Check out our{" "}
                <a
                  href="/meeting-info"
                  className="text-etsa-primary hover:text-etsa-secondary transition-colors"
                >
                  Meeting Information page
                </a>{" "}
                for location details, parking, and directions.
              </p>
              <p>
                Have questions? Feel free to{" "}
                <a
                  href="/contact"
                  className="text-etsa-primary hover:text-etsa-secondary transition-colors"
                >
                  contact us
                </a>{" "}
                or reach out on{" "}
                <a
                  href={process.env.NEXT_PUBLIC_MEETUP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-etsa-primary hover:text-etsa-secondary transition-colors"
                >
                  Meetup
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
