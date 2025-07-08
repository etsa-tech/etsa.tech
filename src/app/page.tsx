import Link from 'next/link';
import { PhotoCarousel } from '@/components/PhotoCarousel';
import { CurrentSpeaker } from '@/components/CurrentSpeaker';
import { PostCard } from '@/components/PostCard';
import { getLatestPost, getRecentPosts } from '@/lib/blog';

// Sample photos for the carousel
const meetupPhotos = [
  {
    src: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&h=400&fit=crop',
    alt: 'ETSA meetup presentation',
    caption: 'Sarah Chen presenting Kubernetes Security Best Practices at our January 2024 meetup'
  },
  {
    src: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop',
    alt: 'ETSA networking session',
    caption: 'Networking and knowledge sharing at the Knoxville Tech Center'
  },
  {
    src: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=400&fit=crop',
    alt: 'ETSA workshop session',
    caption: 'Hands-on Docker workshop with David Kim at the Entrepreneur Center'
  },
  {
    src: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=400&fit=crop',
    alt: 'ETSA community discussion',
    caption: 'Community Q&A session after Alex Thompson\'s monitoring presentation'
  }
];

export default function Home() {
  const latestPost = getLatestPost();
  const recentPosts = getRecentPosts(3);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-950 dark:to-secondary-950 py-20">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <div className="space-y-8">
              <div>
                <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                  ETSA
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                  A professional meetup organization based in Knoxville, TN, bringing together
                  systems administrators, DevOps engineers, and technology professionals to share
                  knowledge and build community.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="https://www.meetup.com/etsa-tech"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-lg"
                >
                  Join Our Meetup
                  <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <Link href="/speakers" className="btn btn-outline btn-lg">
                  View Past Speakers
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 pt-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">50+</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Presentations</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">200+</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Members</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">5+</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Years Active</div>
                </div>
              </div>
            </div>

            {/* Photo Carousel */}
            <div className="lg:pl-8">
              <PhotoCarousel photos={meetupPhotos} />
            </div>
          </div>
        </div>
      </section>

      {/* Current Speaker & Recent Posts */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Current Speaker */}
            <div className="lg:col-span-1">
              <CurrentSpeaker latestPost={latestPost} />
            </div>

            {/* Recent Posts */}
            <div className="lg:col-span-2">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Recent Presentations
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Explore our latest speaker presentations and technical content.
                </p>
              </div>

              {recentPosts.length > 0 ? (
                <div className="space-y-6">
                  {recentPosts.map((post) => (
                    <PostCard key={post.slug} post={post} />
                  ))}

                  <div className="text-center pt-6">
                    <Link href="/speakers" className="btn btn-outline">
                      View All Presentations
                      <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎤</div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Coming Soon
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    We&apos;re working on adding content from our past speakers. Check back soon!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              About ETSA
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
              ETSA was founded to create a community where technology professionals in East Tennessee
              could come together to learn, share experiences, and advance their careers. Our monthly
              meetups feature presentations on cutting-edge technologies, best practices, and real-world
              case studies from industry experts.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Learn</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Stay current with the latest technologies and best practices in systems administration and DevOps.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Network</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Connect with like-minded professionals and build lasting relationships in the tech community.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Grow</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Advance your career through knowledge sharing, mentorship, and professional development opportunities.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-primary-600 dark:bg-primary-800">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              Ready to Join Our Community?
            </h2>
            <p className="text-xl text-primary-100 mb-8">
              Whether you&apos;re a seasoned professional or just starting your career in technology,
              ETSA welcomes you to join our growing community of learners and innovators.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://www.meetup.com/etsa-tech"
                target="_blank"
                rel="noopener noreferrer"
                className="btn bg-white text-primary-600 hover:bg-primary-50 btn-lg"
              >
                Join Our Meetup Group
              </a>
              <Link href="/contact" className="btn border-white text-white hover:bg-white hover:text-primary-600 btn-lg">
                Get in Touch
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
