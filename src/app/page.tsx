export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-blue-600 text-white py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">
            ETSA - East Tennessee Systems Administration
          </h1>
          <p className="text-xl mb-8">
            Professional meetup organization in Knoxville, TN
          </p>
          <div className="space-x-4">
            <a
              href="https://www.meetup.com/etsa-tech"
              className="bg-white text-blue-600 px-6 py-3 rounded font-medium inline-block"
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
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            About Our Community
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Learn</h3>
              <p className="text-gray-600">
                Stay current with the latest technologies and best practices.
              </p>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Network</h3>
              <p className="text-gray-600">
                Connect with like-minded professionals in East Tennessee.
              </p>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Grow</h3>
              <p className="text-gray-600">
                Advance your career through knowledge sharing and mentorship.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Our Impact
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">50+</div>
              <div className="text-gray-600">Presentations</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">200+</div>
              <div className="text-gray-600">Members</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">5+</div>
              <div className="text-gray-600">Years Active</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
