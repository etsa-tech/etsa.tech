import { getAllPosts } from "@/lib/blog";
import { getPostSpeakers } from "@/lib/utils";
import { SpeakerList } from "@/components/SpeakerLink";

export const metadata = {
  title: "Meeting Information - ETSA",
  description:
    "Find out when and where ETSA meets. Get directions, parking information, and meeting details.",
};

// Default meeting location
const DEFAULT_LOCATION = {
  name: "Knoxville Entrepreneur Center",
  address: "17 Market Square SUITE 101, Knoxville, TN 37902",
  coordinates: {
    lat: 35.965179,
    lng: -83.919846,
  },
  description: "Our regular meeting location in downtown Knoxville",
  parking:
    "Free street parking available in Market Square garage and surrounding garages. You will get a ticket going in and once you leave after 7PM it's free.",
  accessibility:
    "Building is wheelchair accessible as we meet on the main floor.",
  contact: "Located in the heart of downtown Knoxville's Market Square.",
};

export default function MeetingInfoPage() {
  const posts = getAllPosts();
  const latestPost = posts[0];

  // Check if latest post has custom location
  const customLocation = latestPost?.frontmatter?.meetingLocation;
  const meetingLocation = customLocation || DEFAULT_LOCATION;

  // Get next meeting date from latest post or default
  const nextMeetingDate =
    latestPost?.frontmatter?.meetingDate ||
    "First Tuesday of each month at 7:00 PM";

  return (
    <div className="container py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Meeting Information
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Join us for our regular ETSA meetups! Here&apos;s everything you need
          to know about when and where we meet.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
        {/* Meeting Details */}
        <div className="space-y-8">
          {/* Next Meeting */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title flex items-center">
                <svg
                  className="w-6 h-6 text-etsa-primary mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Next Meeting
              </h2>
            </div>
            <div className="card-content">
              <div className="text-lg font-semibold text-etsa-primary mb-2">
                {nextMeetingDate}
              </div>
              {latestPost && (
                <div className="space-y-2">
                  <a
                    href={`/speakers/${encodeURIComponent(latestPost.slug)}`}
                    className="block group hover:bg-gray-50 dark:hover:bg-gray-800 -mx-2 px-2 py-2 rounded-lg transition-colors"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-etsa-primary transition-colors">
                      {latestPost.frontmatter.title}
                      <svg
                        className="w-4 h-4 inline-block ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                      {latestPost.frontmatter.excerpt}
                    </p>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                      {(() => {
                        const speakers = getPostSpeakers(
                          latestPost.frontmatter,
                        );
                        return speakers.length > 0 ? (
                          <span>
                            Speaker{speakers.length > 1 ? "s" : ""}:{" "}
                            <SpeakerList
                              speakers={speakers}
                              showTitles={false}
                            />
                          </span>
                        ) : (
                          <span>Speaker: TBA</span>
                        );
                      })()}
                    </div>
                  </a>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <a
                  href={process.env.NEXT_PUBLIC_MEETUP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-etsa-primary hover:text-etsa-secondary transition-colors"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M6.98 8.125c0 .995-.681 1.801-1.52 1.801s-1.52-.806-1.52-1.801.681-1.801 1.52-1.801 1.52.806 1.52 1.801zm12.24 0c0 .995-.681 1.801-1.52 1.801s-1.52-.806-1.52-1.801.681-1.801 1.52-1.801 1.52.806 1.52 1.801zm2.78 0c0 .995-.681 1.801-1.52 1.801s-1.52-.806-1.52-1.801.681-1.801 1.52-1.801 1.52.806 1.52 1.801zM12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
                  </svg>
                  RSVP on Meetup
                </a>
              </div>
            </div>
          </div>

          {/* Location Details */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title flex items-center">
                <svg
                  className="w-6 h-6 text-etsa-primary mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Location
              </h2>
            </div>
            <div className="card-content space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {meetingLocation.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {meetingLocation.address}
                </p>
              </div>

              {meetingLocation.description && (
                <p className="text-gray-600 dark:text-gray-300">
                  {meetingLocation.description}
                </p>
              )}

              <div className="space-y-3">
                {meetingLocation.parking && (
                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 text-etsa-primary mr-2 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0a2 2 0 01-2-2v-1"
                      />
                    </svg>
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        Parking:{" "}
                      </span>
                      <span className="text-gray-600 dark:text-gray-300">
                        {meetingLocation.parking}
                      </span>
                    </div>
                  </div>
                )}

                {meetingLocation.accessibility && (
                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 text-etsa-primary mr-2 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        Accessibility:{" "}
                      </span>
                      <span className="text-gray-600 dark:text-gray-300">
                        {meetingLocation.accessibility}
                      </span>
                    </div>
                  </div>
                )}

                {meetingLocation.contact && (
                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 text-etsa-primary mr-2 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        Info:{" "}
                      </span>
                      <span className="text-gray-600 dark:text-gray-300">
                        {meetingLocation.contact}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    meetingLocation.address,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-etsa-primary hover:text-etsa-secondary transition-colors"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  Get Directions
                </a>
              </div>
            </div>
          </div>

          {/* Meeting Format */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title flex items-center">
                <svg
                  className="w-6 h-6 text-etsa-primary mr-3"
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
                What to Expect
              </h2>
            </div>
            <div className="card-content">
              <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-etsa-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>
                    <strong>6:00 PM:</strong> Networking and socializing
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-etsa-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>
                    <strong>6:30 PM:</strong> Welcome and announcements
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-etsa-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>
                    <strong>7:00 PM:</strong> Main presentation
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-etsa-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>
                    <strong>8:00 PM:</strong> After party at our local watering
                    hole
                  </span>
                </li>
              </ul>
              <div className="mt-4 p-3 bg-etsa-accent dark:bg-etsa-secondary/20 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>New to ETSA?</strong> Don&apos;t worry! We&apos;re a
                  friendly group and welcome newcomers. Feel free to introduce
                  yourself and ask questions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="space-y-8">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Location Map</h2>
            </div>
            <div className="card-content p-0">
              <div className="w-full h-96 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                <iframe
                  src={`https://www.google.com/maps/embed/v1/place?key=${
                    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                  }&q=${encodeURIComponent(meetingLocation.address)}&zoom=15`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Meeting Location Map"
                />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Quick Actions</h2>
            </div>
            <div className="card-content space-y-3">
              <a
                href={process.env.NEXT_PUBLIC_MEETUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-etsa-primary hover:bg-etsa-secondary text-white text-center py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Join Our Meetup Group
              </a>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  meetingLocation.address,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full border border-etsa-primary text-etsa-primary hover:bg-etsa-primary hover:text-white text-center py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Get Directions
              </a>
              <a
                href="/contact"
                className="block w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-center py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
