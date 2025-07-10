import React from "react";
import Link from "next/link";

export const metadata = {
  title: "About ETSA",
  description:
    "Learn about ETSA, our mission, history, and the community of technology professionals we serve in East Tennessee.",
};

export default function AboutPage() {
  return (
    <div className="container py-12">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-light-text dark:text-dark-text mb-6">
          About ETSA
        </h1>
        <p className="text-xl text-light-muted dark:text-dark-muted max-w-3xl mx-auto">
          ETSA is a professional meetup organization dedicated to fostering
          knowledge sharing and community building among technology
          professionals in the Knoxville area and beyond.
        </p>
      </div>

      {/* Mission Section */}
      <section className="mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-light-text dark:text-dark-text mb-6">
              Our Mission
            </h2>
            <p className="text-light-muted dark:text-dark-muted leading-relaxed mb-6">
              ETSA exists to create a vibrant community where systems
              administrators, DevOps engineers, cloud architects, and technology
              professionals can come together to learn, share experiences, and
              advance their careers.
            </p>
            <p className="text-light-muted dark:text-dark-muted leading-relaxed">
              We believe that knowledge sharing and collaboration are essential
              for professional growth and innovation in the rapidly evolving
              technology landscape.
            </p>
          </div>
          <div className="card">
            <div className="card-content">
              <h3 className="text-xl font-semibold text-light-text dark:text-dark-text mb-4">
                What We Do
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-primary-500 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-light-muted dark:text-dark-muted">
                    Monthly technical presentations
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-primary-500 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-light-muted dark:text-dark-muted">
                    Hands-on workshops and training
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-primary-500 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-light-muted dark:text-dark-muted">
                    Networking and career development
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-primary-500 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-light-muted dark:text-dark-muted">
                    Community support and mentorship
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* History Section */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-light-text dark:text-dark-text mb-8 text-center">
          Our History
        </h2>
        <div className="max-w-4xl mx-auto">
          <div className="card">
            <div className="card-content">
              <p className="text-light-muted dark:text-dark-muted leading-relaxed mb-6">
                ETSA is a <a href="/static/irs.pdf">501(c)(3)</a> nonprofit
                established in 2012 originally under LOPSA-ETENN to primarily to
                advance the education, community, practice, and support of IT
                Professionals in East TN and beyond! We are an association of IT
                professionals who want to grow professionally and meet
                like-minded friends and colleagues. We meet monthly to hear
                speakers, and get to know fellow IT workers. Whether you&apos;re
                a career professional or a new comer interested in the tech
                scene. You do not have to be a member to come to the meetings.
                Presentation and discussion topics cover nearly every aspect of
                Enterprise IT, including DevOps, Software Development, Data
                Center and Operations Management, Security, Network Engineering,
                databases -- if you work in IT, you will love it here. Click{" "}
                <Link href="/speakers">here</Link> for a sample of some our past
                speaker topics.
              </p>
              <p className="text-light-muted dark:text-dark-muted leading-relaxed mb-6">
                What started as a group of geeks from Oak Ridge National Lab
                (ORNL) in 2012 has grown into a thriving community of over
                {process.env.NEXT_PUBLIC_MEMBER_COUNT}+ members, featuring
                monthly presentations from industry experts, hands-on workshops,
                and networking opportunities with local recruiters and your
                peers..
              </p>
              <p className="text-light-muted dark:text-dark-muted leading-relaxed">
                Throughout our journey, we&apos;ve maintained our core values of
                inclusively, knowledge sharing, and professional growth,
                creating an environment where both newcomers and seasoned
                professionals can learn and contribute.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-light-text dark:text-dark-text mb-12 text-center">
          Our Values
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-primary-600 dark:text-primary-400"
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
            <h3 className="text-xl font-semibold text-light-text dark:text-dark-text mb-2">
              Inclusivity
            </h3>
            <p className="text-light-muted dark:text-dark-muted text-sm">
              We welcome professionals at all levels and from all backgrounds.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-primary-600 dark:text-primary-400"
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
            <h3 className="text-xl font-semibold text-light-text dark:text-dark-text mb-2">
              Learning
            </h3>
            <p className="text-light-muted dark:text-dark-muted text-sm">
              Continuous learning and skill development are at the heart of what
              we do.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-primary-600 dark:text-primary-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-light-text dark:text-dark-text mb-2">
              Sharing
            </h3>
            <p className="text-light-muted dark:text-dark-muted text-sm">
              We believe in the power of sharing knowledge and experiences.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-primary-600 dark:text-primary-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-light-text dark:text-dark-text mb-2">
              Innovation
            </h3>
            <p className="text-light-muted dark:text-dark-muted text-sm">
              We embrace new technologies and innovative approaches to
              problem-solving.
            </p>
          </div>
        </div>
      </section>

      {/* Leadership Section */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-light-text dark:text-dark-text mb-8 text-center">
          Community Leadership
        </h2>
        <div className="max-w-4xl mx-auto">
          <div className="card">
            <div className="card-content">
              <p className="text-light-muted dark:text-dark-muted leading-relaxed mb-6">
                ETSA is led by a dedicated group of volunteers who are
                passionate about building and maintaining our community. Our
                leadership team consists of experienced technology professionals
                who donate their time to organize events, coordinate speakers,
                and ensure our meetups provide value to all attendees.
              </p>
              <p className="text-light-muted dark:text-dark-muted leading-relaxed">
                If you&apos;re interested in getting involved in ETSA leadership
                or have ideas for improving our community, we&apos;d love to
                hear from you. Leadership opportunities are available for
                members who want to contribute to our mission.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="text-center">
        <div className="card bg-primary-50 dark:bg-primary-950 border-primary-200 dark:border-primary-800">
          <div className="card-content">
            <h2 className="text-2xl font-bold text-primary-900 dark:text-primary-100 mb-4">
              Join Our Community
            </h2>
            <p className="text-primary-800 dark:text-primary-200 mb-6">
              Ready to connect with fellow technology professionals and advance
              your career? Join ETSA today and become part of East
              Tennessee&apos;s premier tech community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://www.meetup.com/etsa-tech"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Join Our Meetup
              </a>
              <a href="/contact" className="btn btn-outline">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
