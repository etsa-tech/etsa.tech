export default function AssetsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Asset Management
        </h1>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          Upload and manage images and files for your blog posts.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="text-center py-12">
          <span className="text-4xl">🖼️</span>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Asset management coming soon
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            File upload and asset management functionality will be available in the next update.
          </p>
        </div>
      </div>
    </div>
  );
}
